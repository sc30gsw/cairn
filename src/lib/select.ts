export function onRequiredSelect(onChange: (value: string) => void) {
  return (value: string | null) => {
    if (value !== null) {
      onChange(value);
    }
  };
}
