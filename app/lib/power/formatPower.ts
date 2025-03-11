export function formatPowerKWh(kilowattHours: number): string {
  const units = ["kWh", "MWh", "GWh", "TWh"];
  let value = kilowattHours;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }

  // Format with appropriate decimal places
  const formattedValue =
    value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);

  return `${formattedValue} ${units[unitIndex]}`;
}
