"""Walk-forward optimization for parameter tuning.

This module provides walk-forward optimization that uses rolling
in-sample/out-of-sample windows to find robust parameters.
"""

import itertools
from datetime import datetime, timedelta
from typing import Any

from trader.backtesting.data_loader import DataLoader
from trader.backtesting.engine import BacktestEngine
from trader.backtesting.models import (
    BacktestConfig,
    BacktestMetrics,
    OptimizationConfig,
    OptimizationResult,
    SimulatedTrade,
)


class WalkForwardOptimizer:
    """Walk-forward optimizer for finding robust parameters.

    Uses rolling windows to optimize parameters on in-sample data
    and validate on out-of-sample data.
    """

    def __init__(
        self,
        data_loader: DataLoader,
    ) -> None:
        """Initialize the optimizer.

        Args:
            data_loader: Data loader for historical data.
        """
        self.data_loader = data_loader
        self._engine = BacktestEngine(data_loader)

    async def optimize(self, config: OptimizationConfig) -> OptimizationResult:
        """Run walk-forward optimization.

        Args:
            config: Optimization configuration.

        Returns:
            OptimizationResult with best parameters and combined metrics.
        """
        base = config.base_config

        # Generate walk-forward windows
        windows = self._generate_windows(
            start_date=base.start_date,
            end_date=base.end_date,
            in_sample_months=config.in_sample_months,
            out_of_sample_months=config.out_of_sample_months,
        )

        if not windows:
            return OptimizationResult(
                windows=[],
                best_parameters={},
                combined_metrics=BacktestMetrics(),
                robustness_score=0.0,
            )

        # Generate parameter grid
        param_grid = self._generate_parameter_grid(config.parameters)

        # Process each window
        window_results: list[dict[str, Any]] = []
        all_oos_trades: list[SimulatedTrade] = []
        all_oos_equity: list[Any] = []
        best_params_per_window: list[dict[str, float]] = []

        for window in windows:
            is_start, is_end, oos_start, oos_end = window

            # Find best parameters on in-sample
            best_params, best_metric = await self._optimize_window(
                base_config=base,
                param_grid=param_grid,
                start_date=is_start,
                end_date=is_end,
                optimization_target=config.optimization_target,
            )

            # Validate on out-of-sample
            oos_config = self._create_config_with_params(base, best_params)
            oos_config = BacktestConfig(
                symbol=oos_config.symbol,
                higher_timeframe=oos_config.higher_timeframe,
                lower_timeframe=oos_config.lower_timeframe,
                start_date=oos_start,
                end_date=oos_end,
                initial_capital=oos_config.initial_capital,
                risk_per_trade=oos_config.risk_per_trade,
                lookback_periods=oos_config.lookback_periods,
                confluence_threshold=oos_config.confluence_threshold,
                validation_pass_threshold=oos_config.validation_pass_threshold,
                atr_stop_multiplier=oos_config.atr_stop_multiplier,
                breakeven_at_r=oos_config.breakeven_at_r,
                trailing_stop_at_r=oos_config.trailing_stop_at_r,
                trailing_stop_atr=oos_config.trailing_stop_atr,
            )

            oos_result = await self._engine.run(oos_config)

            # Store results
            window_results.append({
                "in_sample_start": is_start.isoformat(),
                "in_sample_end": is_end.isoformat(),
                "out_of_sample_start": oos_start.isoformat(),
                "out_of_sample_end": oos_end.isoformat(),
                "best_params": best_params,
                "in_sample_metric": best_metric,
                "out_of_sample_metrics": oos_result.metrics.to_dict(),
            })

            all_oos_trades.extend(oos_result.trades)
            all_oos_equity.extend(oos_result.equity_curve)
            best_params_per_window.append(best_params)

        # Combine out-of-sample results
        from trader.backtesting.metrics import MetricsCalculator
        calc = MetricsCalculator()
        combined_metrics = calc.calculate_metrics(
            trades=all_oos_trades,
            equity_curve=all_oos_equity,
            initial_capital=base.initial_capital,
        )

        # Find most common best parameters
        best_params = self._find_robust_params(best_params_per_window)

        # Calculate robustness score
        robustness = self._calculate_robustness(best_params_per_window)

        return OptimizationResult(
            windows=window_results,
            best_parameters=best_params,
            combined_metrics=combined_metrics,
            robustness_score=robustness,
        )

    def _generate_windows(
        self,
        start_date: datetime,
        end_date: datetime,
        in_sample_months: int,
        out_of_sample_months: int,
    ) -> list[tuple[datetime, datetime, datetime, datetime]]:
        """Generate walk-forward windows.

        Args:
            start_date: Overall start date.
            end_date: Overall end date.
            in_sample_months: Months for in-sample.
            out_of_sample_months: Months for out-of-sample.

        Returns:
            List of (is_start, is_end, oos_start, oos_end) tuples.
        """
        windows = []
        window_size = timedelta(days=(in_sample_months + out_of_sample_months) * 30)
        step = timedelta(days=out_of_sample_months * 30)

        current_start = start_date
        in_sample_days = in_sample_months * 30
        oos_days = out_of_sample_months * 30

        while current_start + window_size <= end_date:
            is_start = current_start
            is_end = current_start + timedelta(days=in_sample_days)
            oos_start = is_end
            oos_end = oos_start + timedelta(days=oos_days)

            if oos_end <= end_date:
                windows.append((is_start, is_end, oos_start, oos_end))

            current_start += step

        return windows

    def _generate_parameter_grid(
        self,
        parameters: list[Any],
    ) -> list[dict[str, float]]:
        """Generate all parameter combinations for grid search.

        Args:
            parameters: List of OptimizationParameter objects.

        Returns:
            List of parameter dictionaries.
        """
        if not parameters:
            return [{}]

        # Get all values for each parameter
        param_values = {}
        for param in parameters:
            param_values[param.name] = param.get_values()

        # Generate all combinations
        keys = list(param_values.keys())
        value_lists = [param_values[k] for k in keys]

        grid = []
        for combo in itertools.product(*value_lists):
            params = dict(zip(keys, combo, strict=True))
            grid.append(params)

        return grid

    async def _optimize_window(
        self,
        base_config: BacktestConfig,
        param_grid: list[dict[str, float]],
        start_date: datetime,
        end_date: datetime,
        optimization_target: str,
    ) -> tuple[dict[str, float], float]:
        """Find best parameters for a single window.

        Args:
            base_config: Base configuration.
            param_grid: Parameter combinations to test.
            start_date: Window start.
            end_date: Window end.
            optimization_target: Metric to optimize.

        Returns:
            Tuple of (best_params, best_metric_value).
        """
        best_params: dict[str, float] = {}
        best_metric = float("-inf")

        for params in param_grid:
            config = self._create_config_with_params(base_config, params)
            config = BacktestConfig(
                symbol=config.symbol,
                higher_timeframe=config.higher_timeframe,
                lower_timeframe=config.lower_timeframe,
                start_date=start_date,
                end_date=end_date,
                initial_capital=config.initial_capital,
                risk_per_trade=config.risk_per_trade,
                lookback_periods=config.lookback_periods,
                confluence_threshold=config.confluence_threshold,
                validation_pass_threshold=config.validation_pass_threshold,
                atr_stop_multiplier=config.atr_stop_multiplier,
                breakeven_at_r=config.breakeven_at_r,
                trailing_stop_at_r=config.trailing_stop_at_r,
                trailing_stop_atr=config.trailing_stop_atr,
            )

            result = await self._engine.run(config)

            # Get target metric
            metric_value = getattr(result.metrics, optimization_target, 0.0)

            if metric_value > best_metric:
                best_metric = metric_value
                best_params = params

        return best_params, best_metric

    def _create_config_with_params(
        self,
        base_config: BacktestConfig,
        params: dict[str, float],
    ) -> BacktestConfig:
        """Create a config with updated parameters.

        Args:
            base_config: Base configuration.
            params: Parameters to override.

        Returns:
            New BacktestConfig with updated params.
        """
        config_dict = base_config.to_dict()

        for key, value in params.items():
            if key in config_dict:
                config_dict[key] = value

        # Handle int conversions
        if "lookback_periods" in config_dict:
            config_dict["lookback_periods"] = int(config_dict["lookback_periods"])
        if "confluence_threshold" in config_dict:
            threshold = int(config_dict["confluence_threshold"])
            config_dict["confluence_threshold"] = threshold

        # Convert dates back to datetime
        config_dict["start_date"] = datetime.fromisoformat(config_dict["start_date"])
        config_dict["end_date"] = datetime.fromisoformat(config_dict["end_date"])

        return BacktestConfig(**config_dict)

    def _find_robust_params(
        self,
        params_per_window: list[dict[str, float]],
    ) -> dict[str, float]:
        """Find most robust parameters across windows.

        Uses median values to reduce sensitivity to outliers.

        Args:
            params_per_window: Best parameters for each window.

        Returns:
            Robust parameter values.
        """
        if not params_per_window:
            return {}

        # Collect values for each parameter
        param_values: dict[str, list[float]] = {}
        for params in params_per_window:
            for key, value in params.items():
                if key not in param_values:
                    param_values[key] = []
                param_values[key].append(value)

        # Use median for each parameter
        robust_params: dict[str, float] = {}
        for key, values in param_values.items():
            sorted_values = sorted(values)
            mid = len(sorted_values) // 2
            if len(sorted_values) % 2 == 0:
                median = (sorted_values[mid - 1] + sorted_values[mid]) / 2
            else:
                median = sorted_values[mid]
            robust_params[key] = median

        return robust_params

    def _calculate_robustness(
        self,
        params_per_window: list[dict[str, float]],
    ) -> float:
        """Calculate robustness score based on parameter stability.

        Higher score means parameters were consistent across windows.

        Args:
            params_per_window: Best parameters for each window.

        Returns:
            Robustness score (0-1).
        """
        if len(params_per_window) < 2:
            return 1.0

        # Calculate coefficient of variation for each parameter
        param_values: dict[str, list[float]] = {}
        for params in params_per_window:
            for key, value in params.items():
                if key not in param_values:
                    param_values[key] = []
                param_values[key].append(value)

        if not param_values:
            return 1.0

        cvs = []
        for values in param_values.values():
            mean = sum(values) / len(values)
            if mean == 0:
                continue
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            std = variance ** 0.5
            cv = std / abs(mean)
            cvs.append(cv)

        if not cvs:
            return 1.0

        # Average CV across all parameters
        avg_cv = sum(cvs) / len(cvs)

        # Convert to 0-1 score (lower CV = higher robustness)
        # CV of 0 = robustness 1, CV of 1 = robustness ~0.37
        import math
        robustness = math.exp(-avg_cv)

        return robustness
