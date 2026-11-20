import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSky} from '../src/sky.ts';

test('day/night transition hides daytime sun and shows moon, stars and a finite meteor streak',()=>{
  const scene=new T.Scene(),sky=createSky(scene,false);
  assert.equal(scene.getObjectByName('moon')!.visible,false);assert.equal(scene.getObjectByName('stars')!.visible,false);
  sky.setNight(true);for(let i=1;i<=20;i++)sky.update(i*.1);
  assert.ok(sky.nightBlend>.95);assert.equal(scene.getObjectByName('moon')!.visible,true);assert.equal(scene.getObjectByName('stars')!.visible,true);
  const meteor=scene.getObjectByName('meteor')!;assert.equal(meteor.visible,true);assert.ok(meteor.position.toArray().every(Number.isFinite));
  sky.update(3);assert.equal(meteor.visible,false);
  sky.setNight(false);assert.equal(sky.nightBlend>0,true);for(let i=31;i<90;i++)sky.update(i*.1);
  assert.equal(sky.nightBlend,0);assert.equal(scene.getObjectByName('moon')!.visible,false);assert.equal(scene.getObjectByName('stars')!.visible,false);assert.equal(meteor.visible,false);
  sky.dispose();assert.equal(scene.children.length,0);
});
test('saved night preference applies immediately and reduced motion suppresses meteors',()=>{
  const scene=new T.Scene(),sky=createSky(scene,true);sky.setNight(true,true);sky.update(2);
  assert.equal(sky.nightBlend,1);assert.equal(scene.getObjectByName('moon')!.visible,true);assert.equal(scene.getObjectByName('meteor')!.visible,false);
  sky.setNight(false);sky.update(2.1);assert.equal(sky.nightBlend,0);sky.dispose();
});
