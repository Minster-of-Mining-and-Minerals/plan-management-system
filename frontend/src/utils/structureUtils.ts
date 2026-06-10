export function isStructureActive(isActive: unknown): boolean {
  if (
    isActive === false ||
    isActive === 0 ||
    isActive === "false" ||
    isActive === "0"
  ) {
    return false;
  }

  return (
    isActive === true ||
    isActive === 1 ||
    isActive === "true" ||
    isActive === "1"
  );
}
