const touchDevice = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
export { touchDevice };
