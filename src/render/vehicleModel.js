import { buildVehicle, PROPORTIONS } from './vehicleBody.js';
export function buildFallbackBody(id) { return PROPORTIONS[id] ? buildVehicle(id) : null; }
export async function loadVehicleModel(id) { return buildFallbackBody(id); }
export async function awaitPlayerModel() { return null; }
export function preloadPlayerModels() {}
export function preloadTrafficModels() {}
export function trafficModel() { return null; }
export function semiRig() { return null; }
