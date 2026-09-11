function createCheerPicker(random = Math.random) {
  let bag = [], recent = [];
  return (tier = 1) => {
    const eligible = Array.from({ length: tier >= 2 ? 11 : 5 }, (_, i) => `cheer-${i + 2}`);
    let choices = bag.filter((name2) => eligible.includes(name2) && !recent.includes(name2));
    choices.length || (bag = eligible.filter((name2) => !recent.includes(name2)), choices = bag);
    const name = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
    return bag = bag.filter((value) => value !== name), recent = [...recent, name].slice(-4), name;
  };
}
export {
  createCheerPicker
};
