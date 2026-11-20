import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLanterns,lanternPosition} from '../src/lanterns.ts';
import type {LanternView} from '../src/shared.ts';
test('lantern flight rises continuously, fades out, and clears instanced resources',()=>{
  const l:LanternView={id:'1',ownerId:'test',x:17,z:12.35,color:'#ef582c',releasedAt:1000,expiresAt:61000};
  assert.equal(lanternPosition(l,900).y,1.03);const middle=lanternPosition(l,31000);assert.ok(middle.y>25);assert.ok(lanternPosition(l,60000).scale<.3);assert.equal(lanternPosition(l,61000).visible,false);
  const scene=new T.Scene(),system=createLanterns(scene,true);system.setWorld([l]);system.update(31000);assert.equal(scene.children.length,3);scene.children.forEach(m=>assert.equal((m as T.InstancedMesh).count,1));
  system.update(61000);scene.children.forEach(m=>assert.equal((m as T.InstancedMesh).count,0));system.dispose();assert.equal(scene.children.length,0);
});
