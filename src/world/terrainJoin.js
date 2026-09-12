function* prepareTerrainJoin(current, next, plane) {
  const clone = (terrain) => Object.assign(Object.create(Object.getPrototypeOf(terrain)), terrain, { geo: terrain.geo.clone(), H: terrain.H.slice(), roadProtectors: new Set(terrain.roadProtectors || []) }), view = clone(current), nextView = clone(next);
  let transferred = false, committed = false;
  const dispose = () => {
    for (const terrain of [view, nextView]) terrain.geo && (terrain.geo.dispose(), terrain.geo = null);
  };
  try {
    yield "attachment.terrain-copy", yield* view.protectRoadSteps(nextView), yield* nextView.protectRoadSteps(view), view.clipSteps ? yield* view.clipSteps(plane, next.world, nextView) : view.clipAt(plane, next.world, nextView), yield "attachment.terrain-clip", view.weldSteps ? yield* view.weldSteps(nextView) : view.weldTo(nextView), yield "attachment.terrain-weld";
    const live = (terrain) => terrain === view ? current : terrain === nextView ? next : terrain, commit = () => {
      if (!(committed || !view.geo || !nextView.geo)) {
        committed = true;
        for (const [target, prepared] of [[current, view], [next, nextView]]) {
          target.exitClip = prepared.exitClip, target.prevTerrain = live(prepared.prevTerrain), target.nextTerrain = live(prepared.nextTerrain), target.roadProtectors = new Set([...prepared.roadProtectors].map(live)), target.H.set(prepared.H), target.geo.index.array.set(prepared.geo.index.array), target.geo.index.needsUpdate = true, target.geo.setDrawRange(prepared.geo.drawRange.start, prepared.geo.drawRange.count);
          for (const name of ["position", "normal"]) target.geo.attributes[name].array.set(prepared.geo.attributes[name].array), target.geo.attributes[name].needsUpdate = true;
          target.seamVerts = prepared.seamVerts, target.geo.boundingSphere = prepared.geo.boundingSphere?.clone() || null;
        }
      }
    };
    return transferred = true, { current: view, next: nextView, commit, dispose };
  } finally {
    transferred || dispose();
  }
}
export {
  prepareTerrainJoin
};
