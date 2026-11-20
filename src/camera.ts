// Camera math is independent from WebGL so limits can be checked without a GPU.
export const CAMERA_LIMITS={minPitch:-1.12,maxPitch:1.3,minDistance:6,maxDistance:48};
export const clampPitch=(pitch:number)=>Math.max(CAMERA_LIMITS.minPitch,Math.min(CAMERA_LIMITS.maxPitch,pitch));
export const clampDistance=(distance:number)=>Math.max(CAMERA_LIMITS.minDistance,Math.min(CAMERA_LIMITS.maxDistance,distance));
export function cameraOrbit(distance:number,pitch:number){
  const angle=clampPitch(pitch),r=clampDistance(distance);
  const horizontal=r*Math.cos(Math.max(0,angle));
  return {horizontal,height:r*Math.sin(Math.max(0,angle)),lookUp:angle<0?Math.tan(-angle)*horizontal:0};
}
