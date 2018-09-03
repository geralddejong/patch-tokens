declare function logBoolean(idx: u32, b: boolean): void;

declare function logFloat(idx: u32, f: f32): void;

declare function logInt(idx: u32, i: u32): void;

const ERROR: usize = 65535;
const ROLE_SIZE: usize = sizeof<i8>();
const JOINT_NAME_SIZE: usize = sizeof<u16>();
const INDEX_SIZE: usize = sizeof<u16>();
const SPAN_VARIATION_SIZE: usize = sizeof<i16>();
const FLOAT_SIZE: usize = sizeof<f32>();
const AGE_SIZE: usize = sizeof<u32>();
const VARIATION_COUNT: u8 = 3;
const VECTOR_SIZE: usize = FLOAT_SIZE * 3;
const METADATA_SIZE: usize = VECTOR_SIZE * 3;

const JOINT_RADIUS: f32 = 0.15;
const AMBIENT_JOINT_MASS: f32 = 0.1;
const SPRING_SMOOTH: f32 = 0.03; // const BAR_SMOOTH: f32 = 0.6; const CABLE_SMOOTH: f32 = 0.01;

const BILATERAL_MIDDLE: u8 = 0;
const BILATERAL_RIGHT: u8 = 1;
const BILATERAL_LEFT: u8 = 2;

// Dimensioning ================================================================================

let jointCount: u16 = 0;
let jointCountMax: u16 = 0;
let jointTagCount: u16 = 0;
let intervalCount: u16 = 0;
let intervalCountMax: u16 = 0;
let faceCount: u16 = 0;
let faceCountMax: u16 = 0;

let lineLocationOffset: usize = 0;
let lineColorOffset: usize = 0;
let jointOffset: usize = 0;
let faceMidpointOffset: usize = 0;
let faceNormalOffset: usize = 0;
let faceLocationOffset: usize = 0;
let intervalOffset: usize = 0;
let faceOffset: usize = 0;
let behaviorOffset: usize = 0;

let projectionPtr: usize = 0;
let alphaProjectionPtr: usize = 0;
let omegaProjectionPtr: usize = 0;
let gravPtr: usize = 0;
let agePtr: usize = 0;

export function init(joints: u16, intervals: u16, faces: u16): usize {
    jointCountMax = joints;
    intervalCountMax = intervals;
    faceCountMax = faces;
    let intervalLinesSize = intervalCountMax * VECTOR_SIZE * 2;
    let intervalColorsSize = intervalLinesSize;
    let faceVectorsSize = faceCountMax * VECTOR_SIZE;
    let faceJointVectorsSize = faceVectorsSize * 3;
    let jointsSize = jointCountMax * JOINT_SIZE;
    let intervalsSize = intervalCountMax * INTERVAL_SIZE;
    let facesSize = faceCountMax * FACE_SIZE;
    let behaviorSize = ROLE_INDEX_MAX * BEHAVIOR_SIZE;
    // offsets
    let bytes = (
        agePtr = (
            gravPtr = (
                omegaProjectionPtr = (
                    alphaProjectionPtr = (
                        projectionPtr = (
                            behaviorOffset = (
                                faceOffset = (
                                    intervalOffset = (
                                        jointOffset = (
                                            faceLocationOffset = (
                                                faceNormalOffset = (
                                                    faceMidpointOffset = (
                                                        lineColorOffset = (
                                                            lineLocationOffset
                                                        ) + intervalLinesSize
                                                    ) + intervalColorsSize
                                                ) + faceVectorsSize
                                            ) + faceJointVectorsSize
                                        ) + faceJointVectorsSize
                                    ) + jointsSize
                                ) + intervalsSize
                            ) + behaviorSize
                        ) + facesSize
                    ) + VECTOR_SIZE
                ) + VECTOR_SIZE
            ) + VECTOR_SIZE
        ) + VECTOR_SIZE
    ) + AGE_SIZE;
    let blocks = bytes >> 16;
    memory.grow(blocks + 1);
    for (let roleIndex: u8 = 0; roleIndex < ROLE_INDEX_MAX; roleIndex++) {
        initBehavior(roleIndex);
    }
    return bytes;
}

export function joints(): usize {
    return jointCount;
}

export function intervals(): usize {
    return intervalCount;
}

export function faces(): usize {
    return faceCount;
}

export function nextJointTag(): u16 {
    jointTagCount++;
    return jointTagCount;
}

// Peek and Poke ================================================================================

@inline()
export function getAge(): i32 {
    return load<i32>(agePtr);
}

export function age(): i32 {
    return getAge();
}

@inline()
function timePasses(): void {
    store<i32>(agePtr, getAge() + 1);
}

@inline()
function getVariation(vPtr: usize): i16 {
    return load<i16>(vPtr);
}

@inline()
function setVariation(vPtr: usize, variation: i16): void {
    store<i16>(vPtr, variation);
}

@inline()
function getIndex(vPtr: usize): u16 {
    return load<u16>(vPtr);
}

@inline()
function setIndex(vPtr: usize, index: u16): void {
    store<u16>(vPtr, index);
}

@inline()
function getFloat(vPtr: usize): f32 {
    return load<f32>(vPtr);
}

@inline()
function setFloat(vPtr: usize, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getX(vPtr: usize): f32 {
    return load<f32>(vPtr);
}

@inline()
function setX(vPtr: usize, v: f32): void {
    store<f32>(vPtr, v);
}

@inline()
function getY(vPtr: usize): f32 {
    return load<f32>(vPtr + FLOAT_SIZE);
}

@inline()
function setY(vPtr: usize, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE, v);
}

@inline()
function getZ(vPtr: usize): f32 {
    return load<f32>(vPtr + FLOAT_SIZE * 2);
}

@inline()
function setZ(vPtr: usize, v: f32): void {
    store<f32>(vPtr + FLOAT_SIZE * 2, v);
}

// Vector3 ================================================================================

function setAll(vPtr: usize, x: f32, y: f32, z: f32): void {
    setX(vPtr, x);
    setY(vPtr, y);
    setZ(vPtr, z);
}

function setVector(vPtr: usize, v: usize): void {
    setX(vPtr, getX(v));
    setY(vPtr, getY(v));
    setZ(vPtr, getZ(v));
}

function zero(vPtr: usize): void {
    setAll(vPtr, 0, 0, 0);
}

function addVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) + getX(b));
    setY(vPtr, getY(a) + getY(b));
    setZ(vPtr, getZ(a) + getZ(b));
}

function subVectors(vPtr: usize, a: usize, b: usize): void {
    setX(vPtr, getX(a) - getX(b));
    setY(vPtr, getY(a) - getY(b));
    setZ(vPtr, getZ(a) - getZ(b));
}

function add(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) + getX(v));
    setY(vPtr, getY(vPtr) + getY(v));
    setZ(vPtr, getZ(vPtr) + getZ(v));
}

function sub(vPtr: usize, v: usize): void {
    setX(vPtr, getX(vPtr) - getX(v));
    setY(vPtr, getY(vPtr) - getY(v));
    setZ(vPtr, getZ(vPtr) - getZ(v));
}

function addScaledVector(vPtr: usize, v: usize, s: f32): void {
    setX(vPtr, getX(vPtr) + getX(v) * s);
    setY(vPtr, getY(vPtr) + getY(v) * s);
    setZ(vPtr, getZ(vPtr) + getZ(v) * s);
}

function multiplyScalar(vPtr: usize, s: f32): void {
    setX(vPtr, getX(vPtr) * s);
    setY(vPtr, getY(vPtr) * s);
    setZ(vPtr, getZ(vPtr) * s);
}

function dot(vPtr: usize, v: usize): f32 {
    return getX(vPtr) * getX(v) + getY(vPtr) * getY(v) + getZ(vPtr) * getZ(v);
}

function lerp(vPtr: usize, v: usize, interpolation: f32): void {
    let antiInterpolation = <f32>1.0 - interpolation;
    setX(vPtr, getX(vPtr) * antiInterpolation + getX(v) * interpolation);
    setY(vPtr, getY(vPtr) * antiInterpolation + getY(v) * interpolation);
    setX(vPtr, getZ(vPtr) * antiInterpolation + getZ(v) * interpolation);
}

function quadrance(vPtr: usize): f32 {
    let x = getX(vPtr);
    let y = getY(vPtr);
    let z = getZ(vPtr);
    return x * x + y * y + z * z + 0.00000001;
}

function distance(a: usize, b: usize): f32 {
    let dx = getX(a) - getX(b);
    let dy = getY(a) - getY(b);
    let dz = getZ(a) - getZ(b);
    return <f32>Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function length(vPtr: usize): f32 {
    return <f32>Math.sqrt(quadrance(vPtr));
}

function crossVectors(vPtr: usize, a: usize, b: usize): void {
    let ax = getX(a);
    let ay = getY(a);
    let az = getZ(a);
    let bx = getX(b);
    let by = getY(b);
    let bz = getZ(b);
    setX(vPtr, ay * bz - az * by);
    setY(vPtr, az * bx - ax * bz);
    setZ(vPtr, ax * by - ay * bx);
}

// Joints =====================================================================================

const JOINT_SIZE: usize = VECTOR_SIZE * 5 + ROLE_SIZE + JOINT_NAME_SIZE + FLOAT_SIZE * 2;

export function createJoint(jointTag: u16, laterality: u8, x: f32, y: f32, z: f32): usize {
    if (jointCount + 1 >= jointCountMax) {
        return ERROR;
    }
    let jointIndex = jointCount++;
    setAll(locationPtr(jointIndex), x, y, z);
    zero(forcePtr(jointIndex));
    zero(velocityPtr(jointIndex));
    zero(gravityPtr(jointIndex));
    zero(absorbVelocityPtr(jointIndex));
    setFloat(intervalMassPtr(jointIndex), AMBIENT_JOINT_MASS);
    setJointLaterality(jointIndex, laterality);
    setJointTag(jointIndex, jointTag);
    return jointIndex;
}

function jointPtr(jointIndex: u16): usize {
    return jointOffset + jointIndex * JOINT_SIZE;
}

function locationPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex);
}

function velocityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE;
}

function absorbVelocityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 2;
}

function forcePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 3;
}

function gravityPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 4;
}

function intervalMassPtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5;
}

function altitudePtr(jointIndex: u16): usize {
    return jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE;
}

function setJointLaterality(jointIndex: u16, laterality: u8): void {
    store<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2, laterality);
}

function setJointTag(jointIndex: u16, tag: u16): void {
    store<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ROLE_SIZE, tag);
}

export function getJointLaterality(jointIndex: u16): u8 {
    return load<u8>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2);
}

export function getJointTag(jointIndex: u16): u16 {
    return load<u16>(jointPtr(jointIndex) + VECTOR_SIZE * 5 + FLOAT_SIZE * 2 + ROLE_SIZE);
}

export function centralize(altitude: f32, intensity: f32): void {
    let x: f32 = 0;
    let lowY: f32 = 10000;
    let z: f32 = 0;
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        x += getX(jointPtr(thisJoint));
        let y = getY(jointPtr(thisJoint));
        if (y < lowY) {
            lowY = y;
        }
        z += getZ(jointPtr(thisJoint));
    }
    x = x / <f32>jointCount;
    z = z / <f32>jointCount;
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        let jPtr = jointPtr(thisJoint);
        setX(jPtr, getX(jPtr) - x * intensity);
        if (altitude >= 0) {
            setY(jPtr, getY(jPtr) - lowY + altitude);
        }
        setZ(jPtr, getZ(jPtr) - z * intensity);
    }
}

// Intervals =====================================================================================

const INTERVAL_SIZE: usize = ROLE_SIZE + INDEX_SIZE * 3 + VECTOR_SIZE + FLOAT_SIZE * 2;

export function createInterval(role: i8, alphaIndex: u16, omegaIndex: u16, idealSpan: f32): usize {
    if (intervalCount + 1 >= intervalCountMax) {
        return ERROR;
    }
    let intervalIndex = intervalCount++;
    setIntervalRole(intervalIndex, role);
    setAlphaIndex(intervalIndex, alphaIndex);
    setOmegaIndex(intervalIndex, omegaIndex);
    setTimeIndex(intervalIndex, 0);
    setFloat(idealSpanPtr(intervalIndex), idealSpan > 0 ? idealSpan : calculateSpan(intervalIndex));
    return intervalIndex;
}

function intervalPtr(intervalIndex: u16): usize {
    return intervalOffset + intervalIndex * INTERVAL_SIZE;
}

export function getIntervalRole(intervalIndex: u16): i8 {
    return load<i8>(intervalPtr(intervalIndex));
}

export function setIntervalRole(intervalIndex: u16, role: i8): void {
    store<i8>(intervalPtr(intervalIndex), role);
}

function getAlphaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + ROLE_SIZE);
}

function setAlphaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + ROLE_SIZE, v);
}

function getOmegaIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE);
}

function setOmegaIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE, v);
}

function getTimeIndex(intervalIndex: u16): u16 {
    return getIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 2);
}

function setTimeIndex(intervalIndex: u16, v: u16): void {
    setIndex(intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 2, v);
}

function unitPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 3;
}

function stressPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 3 + VECTOR_SIZE;
}

function idealSpanPtr(intervalIndex: u16): usize {
    return intervalPtr(intervalIndex) + ROLE_SIZE + INDEX_SIZE * 3 + VECTOR_SIZE + FLOAT_SIZE;
}

function calculateSpan(intervalIndex: u16): f32 {
    let unit = unitPtr(intervalIndex);
    subVectors(unit, locationPtr(getOmegaIndex(intervalIndex)), locationPtr(getAlphaIndex(intervalIndex)));
    let span = length(unit);
    multiplyScalar(unit, 1 / span);
    return span;
}

function removeInterval(intervalIndex: u16): void {
    for (let walk: u16 = intervalIndex * <u16>INTERVAL_SIZE; walk < intervalIndex * INTERVAL_SIZE * intervalCount - 1; walk++) {
        store<u8>(walk, load<u8>(walk + INTERVAL_SIZE));
    }
    intervalCount--;
}

function findIntervalIndex(joint0: u16, joint1: u16): u16 {
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alpha = getAlphaIndex(thisInterval);
        let omega = getOmegaIndex(thisInterval);
        if (alpha === joint0 && omega === joint1 || alpha === joint1 && omega === joint0) {
            return thisInterval;
        }
    }
    return intervalCountMax;
}

export function triggerInterval(intervalIndex: u16): void {
    setTimeIndex(intervalIndex, 1);
}

export function findOppositeIntervalIndex(intervalIndex: u16): u16 {
    let tagAlpha = getJointTag(getAlphaIndex(intervalIndex));
    let tagOmega = getJointTag(getAlphaIndex(intervalIndex));
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        if (thisInterval == intervalIndex) {
            continue;
        }
        let thisTagAlpha = getJointTag(getAlphaIndex(intervalIndex));
        let thisTagOmega = getJointTag(getOmegaIndex(intervalIndex));
        let matchAlpha = tagAlpha === thisTagAlpha || tagAlpha === thisTagOmega;
        let matchOmega = tagOmega === thisTagOmega || tagOmega === thisTagAlpha;
        if (matchAlpha && matchOmega) {
            return thisInterval;
        }
    }
    return intervalCountMax;
}

// Lines depicting the intervals ================================================================

const LINE_SIZE: usize = VECTOR_SIZE * 2;

function outputAlphaLocationPtr(intervalIndex: u16): usize {
    return intervalIndex * LINE_SIZE;
}

function outputOmegaLocationPtr(intervalIndex: u16): usize {
    return intervalIndex * LINE_SIZE + VECTOR_SIZE;
}

function outputAlphaColorPtr(intervalIndex: u16): usize {
    return lineColorOffset + intervalIndex * LINE_SIZE;
}

function outputOmegaColorPtr(intervalIndex: u16): usize {
    return lineColorOffset + intervalIndex * LINE_SIZE + VECTOR_SIZE;
}

// Faces =====================================================================================

const FACE_SIZE: usize = INDEX_SIZE * 3;

function facePtr(faceIndex: u16): usize {
    return faceOffset + faceIndex * FACE_SIZE;
}

export function getFaceJointIndex(faceIndex: u16, jointNumber: usize): u16 {
    return getIndex(facePtr(faceIndex) + jointNumber * INDEX_SIZE);
}

function setFaceJointIndex(faceIndex: u16, jointNumber: u16, v: u16): void {
    setIndex(facePtr(faceIndex) + jointNumber * INDEX_SIZE, v);
}

function getFaceTag(faceIndex: u16, jointNumber: u16): u16 {
    return getJointTag(getFaceJointIndex(faceIndex, jointNumber));
}

function outputMidpointPtr(faceIndex: u16): usize {
    return faceMidpointOffset + faceIndex * VECTOR_SIZE;
}

function outputNormalPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceNormalOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE;
}

function outputLocationPtr(faceIndex: u16, jointNumber: u16): usize {
    return faceLocationOffset + (faceIndex * 3 + jointNumber) * VECTOR_SIZE;
}

export function getFaceLaterality(faceIndex: u16): u8 {
    for (let jointWalk: u16 = 0; jointWalk < 3; jointWalk++) { // face inherits laterality
        let jointLaterality = getJointLaterality(getFaceJointIndex(faceIndex, jointWalk));
        if (jointLaterality !== BILATERAL_MIDDLE) {
            return jointLaterality;
        }
    }
    return BILATERAL_MIDDLE;
}

function pushNormalTowardsJoint(normal: usize, location: usize, midpoint: usize): void {
    subVectors(projectionPtr, location, midpoint);
    multiplyScalar(projectionPtr, 1 / length(projectionPtr));
    addScaledVector(normal, projectionPtr, 0.7);
    multiplyScalar(normal, 1 / length(normal));
}

export function getFaceAverageIdealSpan(faceIndex: u16): f32 {
    let joint0 = getFaceJointIndex(faceIndex, 0);
    let joint1 = getFaceJointIndex(faceIndex, 1);
    let joint2 = getFaceJointIndex(faceIndex, 2);
    let interval0 = findIntervalIndex(joint0, joint1);
    let interval1 = findIntervalIndex(joint1, joint2);
    let interval2 = findIntervalIndex(joint2, joint0);
    let ideal0 = getFloat(idealSpanPtr(interval0));
    let ideal1 = getFloat(idealSpanPtr(interval1));
    let ideal2 = getFloat(idealSpanPtr(interval2));
    return (ideal0 + ideal1 + ideal2) / 3;
}

// Triangles and normals depicting the faces =================================================

function outputFaceGeometry(faceIndex: u16): void {
    let loc0 = locationPtr(getFaceJointIndex(faceIndex, 0));
    let loc1 = locationPtr(getFaceJointIndex(faceIndex, 1));
    let loc2 = locationPtr(getFaceJointIndex(faceIndex, 2));
    // output the locations for rendering triangles
    setVector(outputLocationPtr(faceIndex, 0), loc0);
    setVector(outputLocationPtr(faceIndex, 1), loc1);
    setVector(outputLocationPtr(faceIndex, 2), loc2);
    // midpoint
    let midpoint = outputMidpointPtr(faceIndex);
    zero(midpoint);
    add(midpoint, loc0);
    add(midpoint, loc1);
    add(midpoint, loc2);
    multiplyScalar(midpoint, 1 / 3.0);
    // normals for each vertex
    let normal0 = outputNormalPtr(faceIndex, 0);
    let normal1 = outputNormalPtr(faceIndex, 1);
    let normal2 = outputNormalPtr(faceIndex, 2);
    subVectors(alphaProjectionPtr, loc1, loc0);
    subVectors(omegaProjectionPtr, loc2, loc0);
    crossVectors(normal0, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(normal0, 1 / length(normal0));
    setVector(normal1, normal0);
    setVector(normal2, normal0);
    // adjust them
    pushNormalTowardsJoint(normal0, loc0, midpoint);
    pushNormalTowardsJoint(normal1, loc1, midpoint);
    pushNormalTowardsJoint(normal2, loc2, midpoint);
}

export function findOppositeFaceIndex(faceIndex: u16): u16 {
    let tag0 = getFaceTag(faceIndex, 0);
    let tag1 = getFaceTag(faceIndex, 1);
    let tag2 = getFaceTag(faceIndex, 2);
    for (let thisFace: u16 = 0; thisFace < faceCount; thisFace++) {
        if (thisFace == faceIndex) {
            continue;
        }
        let thisTag0 = getFaceTag(thisFace, 0);
        let thisTag1 = getFaceTag(thisFace, 1);
        let thisTag2 = getFaceTag(thisFace, 2);
        let match0 = tag0 === thisTag0 || tag0 === thisTag1 || tag0 === thisTag2;
        let match1 = tag1 === thisTag0 || tag1 === thisTag1 || tag1 === thisTag2;
        let match2 = tag2 === thisTag0 || tag2 === thisTag1 || tag2 === thisTag2;
        if (match0 && match1 && match2) {
            return thisFace;
        }
    }
    return faceCount + 1;
}

export function createFace(joint0Index: u16, joint1Index: u16, joint2Index: u16): usize {
    if (faceCount + 1 >= faceCountMax) {
        return ERROR;
    }
    let faceIndex = faceCount++;
    setFaceJointIndex(faceIndex, 0, joint0Index);
    setFaceJointIndex(faceIndex, 1, joint1Index);
    setFaceJointIndex(faceIndex, 2, joint2Index);
    outputFaceGeometry(faceIndex);
    return faceIndex;
}

export function removeFace(deadFaceIndex: u16): void {
    for (let faceIndex: u16 = deadFaceIndex; faceIndex < faceCount - 1; faceIndex++) {
        let nextFace = faceIndex + 1;
        setFaceJointIndex(faceIndex, 0, getFaceJointIndex(nextFace, 0));
        setFaceJointIndex(faceIndex, 1, getFaceJointIndex(nextFace, 1));
        setFaceJointIndex(faceIndex, 2, getFaceJointIndex(nextFace, 2));
        outputFaceGeometry(faceIndex);
    }
    faceCount--;
}

// Behavior =====================================================================================

const ROLE_INDEX_MAX: u8 = 64;
const BEHAVIOR_SIZE: usize = (INDEX_SIZE + SPAN_VARIATION_SIZE) * VARIATION_COUNT;
const BEHAVIOR_SPAN_VARIATION_MAX: f32 = 0.2;

function initBehavior(roleIndex: u16): void {
    for (let thisVariation: u8 = 0; thisVariation < VARIATION_COUNT; thisVariation++) {
        let time = Math.random() * 65535.0;
        setIndex(behaviorTimePtr(roleIndex, thisVariation), <u16>time);
        let variation = (Math.random() - 0.5) * 2 * 32767;
        setVariation(behaviorSpanVariationPtr(roleIndex, thisVariation), <i16>variation);
    }
    sortVariations(roleIndex);
}

function behaviorTimePtr(roleIndex: u16, variationIndex: u8): u32 {
    return behaviorOffset + roleIndex * BEHAVIOR_SIZE + variationIndex * (INDEX_SIZE + SPAN_VARIATION_SIZE);
}

function getBehaviorTime(roleIndex: u16, variationIndex: u8): u16 {
    return getIndex(behaviorTimePtr(roleIndex, variationIndex));
}

export function setBehaviorTime(roleIndex: u8, variationIndex: u8, behaviorTime: u16): void {
    setIndex(behaviorTimePtr(roleIndex, variationIndex), behaviorTime);
}

function behaviorSpanVariationPtr(roleIndex: u16, variationIndex: u8): u32 {
    return behaviorOffset + roleIndex * BEHAVIOR_SIZE + variationIndex * (INDEX_SIZE + SPAN_VARIATION_SIZE) + INDEX_SIZE;
}

function getBehaviorSpanVariation(role: i16, variationIndex: u8): f32 {
    let oppositeRole = role < 0;
    let roleIndex = oppositeRole ? -role : role;
    let variationInt = getVariation(behaviorSpanVariationPtr(roleIndex, variationIndex));
    let variationFloat = oppositeRole ? -<f32>variationInt : <f32>variationInt;
    return 1.0 + BEHAVIOR_SPAN_VARIATION_MAX * variationFloat / 65536.0;
}

export function setBehaviorSpanVariation(roleIndex: u8, variationIndex: u8, behaviorSpanVariation: i16): void {
    setVariation(behaviorTimePtr(roleIndex, variationIndex), behaviorSpanVariation);
}

function sortVariations(roleIndex: u16): void {
    let unsorted = VARIATION_COUNT;
    while (true) {
        unsorted--;
        for (let scan: u8 = 0; scan < unsorted; scan++) {
            let t0 = behaviorTimePtr(roleIndex, scan);
            let time0 = getIndex(t0);
            let t1 = behaviorTimePtr(roleIndex, scan + 1);
            let time1 = getIndex(t1);
            if (time0 > time1) {
                setIndex(t0, time1);
                setIndex(t1, time0);
                let s0 = behaviorSpanVariationPtr(roleIndex, scan);
                let spanVariation0 = getVariation(s0);
                let s1 = behaviorSpanVariationPtr(roleIndex, scan + 1);
                let spanVariation1 = getVariation(s1);
                setVariation(s0, spanVariation1);
                setVariation(s1, spanVariation0);
            }
        }
        if (unsorted == 0) {
            break;
        }
    }
}

function interpolateCurrentSpan(intervalIndex: u16, timeIndex: u16): f32 {
    let role = getIntervalRole(intervalIndex);
    let idealSpan = getFloat(idealSpanPtr(intervalIndex));
    if (role === 0) {
        if (timeIndex === 0) {
            return idealSpan;
        } else {
            let originalSpan: f32 = 1;
            if (timeIndex === 1) { // just triggered now, store span in stress (cheating)
                originalSpan = calculateSpan(intervalIndex);
                setFloat(stressPtr(intervalIndex), originalSpan);
            } else {
                originalSpan = getFloat(stressPtr(intervalIndex));
            }
            let progress = <f32>timeIndex / 65536;
            return originalSpan * (1 - progress) + idealSpan * progress;
        }
    } else {
        let beforeTime: u16 = 0;
        let beforeVariation: f32 = 1;
        let variationNumber: u8 = 0;
        let roleIndex: u8 = role > 0 ? role : -role;
        while (variationNumber < VARIATION_COUNT) {
            let behaviorTime = getBehaviorTime(roleIndex, variationNumber);
            if (behaviorTime < timeIndex) {
                beforeTime = behaviorTime;
                beforeVariation = getBehaviorSpanVariation(role, variationNumber);
            }
            variationNumber++;
        }
        let afterTime: u16 = 65535;
        let afterVariation: f32 = 1;
        variationNumber = VARIATION_COUNT;
        while (true) {
            let behaviorTime = getBehaviorTime(roleIndex, variationNumber);
            if (behaviorTime > timeIndex) {
                afterTime = behaviorTime;
                afterVariation = getBehaviorSpanVariation(role, variationNumber);
            }
            if (variationNumber === 0) {
                break;
            }
            variationNumber--;
        }
        let timeSpan = <f32>(afterTime - beforeTime);
        let currentVariation =
            <f32>(timeIndex - beforeTime) / timeSpan * afterVariation +
            <f32>(afterTime - timeIndex) / timeSpan * beforeVariation;
        return idealSpan * currentVariation;
    }
}

// Physics =====================================================================================

@inline
function abs(val: f32): f32 {
    return val < 0 ? -val : val;
}

function elasticBehavior(intervalIndex: u16, elasticFactor: f32, timeIndexStep: u16): void {
    let timeIndex = getTimeIndex(intervalIndex);
    let idealSpan = interpolateCurrentSpan(intervalIndex, timeIndex);
    let stress = elasticFactor * (calculateSpan(intervalIndex) - idealSpan) * idealSpan * idealSpan;
    addScaledVector(forcePtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), stress / 2);
    addScaledVector(forcePtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), -stress / 2);
    if (timeIndex !== 1) {
        setFloat(stressPtr(intervalIndex), stress);
    }
    let mass = idealSpan * idealSpan * idealSpan;
    let alphaMass = intervalMassPtr(getAlphaIndex(intervalIndex));
    setFloat(alphaMass, getFloat(alphaMass) + mass / 2);
    let omegaMass = intervalMassPtr(getOmegaIndex(intervalIndex));
    setFloat(omegaMass, getFloat(omegaMass) + mass / 2);
    if (timeIndex > 0) {
        let currentTimeIndex = timeIndex;
        timeIndex += timeIndexStep;
        if (timeIndex < currentTimeIndex) { // wrap around
            timeIndex = 0;
        }
        setTimeIndex(intervalIndex, timeIndex);
    }
}

function splitVectors(vectorPtr: usize, basisPtr: usize, projectionPtr: usize, howMuch: f32): void {
    let agreement = dot(vectorPtr, basisPtr);
    setVector(projectionPtr, basisPtr);
    multiplyScalar(projectionPtr, agreement * howMuch);
}

function smoothVelocity(intervalIndex: u16): void {
    splitVectors(velocityPtr(getAlphaIndex(intervalIndex)), unitPtr(intervalIndex), alphaProjectionPtr, SPRING_SMOOTH);
    splitVectors(velocityPtr(getOmegaIndex(intervalIndex)), unitPtr(intervalIndex), omegaProjectionPtr, SPRING_SMOOTH);
    addVectors(projectionPtr, alphaProjectionPtr, omegaProjectionPtr);
    multiplyScalar(projectionPtr, 0.5);
    sub(absorbVelocityPtr(getAlphaIndex(intervalIndex)), alphaProjectionPtr);
    sub(absorbVelocityPtr(getOmegaIndex(intervalIndex)), omegaProjectionPtr);
    add(absorbVelocityPtr(getAlphaIndex(intervalIndex)), projectionPtr);
    add(absorbVelocityPtr(getOmegaIndex(intervalIndex)), projectionPtr);
}

function exertGravity(jointIndex: u16, value: f32): void {
    let velocity = velocityPtr(jointIndex);
    setY(velocity, getY(velocity) - value);
}

function exertJointPhysics(jointIndex: u16, overGravity: f32, overDrag: f32, underGravity: f32, underDrag: f32): void {
    let altitude = getY(locationPtr(jointIndex));
    if (altitude > JOINT_RADIUS) {
        exertGravity(jointIndex, overGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - overDrag);
    }
    else if (altitude < -JOINT_RADIUS) {
        exertGravity(jointIndex, -overDrag * underGravity);
        multiplyScalar(velocityPtr(jointIndex), 1 - overDrag * underDrag);
    }
    else {
        let degree = (altitude + JOINT_RADIUS) / (JOINT_RADIUS * 2);
        let gravityValue = overGravity * degree + -overGravity * underGravity * (1 - degree);
        exertGravity(jointIndex, gravityValue);
        let drag = overDrag * degree + overDrag * underDrag * (1 - degree);
        multiplyScalar(velocityPtr(jointIndex), 1 - drag);
    }
}

function tick(elasticFactor: f32, overGravity: f32, overDrag: f32, underGravity: f32, underDrag: f32, timeIndexStep: u16): void {
    timePasses();
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        elasticBehavior(thisInterval, elasticFactor, timeIndexStep);
    }
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        smoothVelocity(thisInterval);
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        exertJointPhysics(thisJoint, overGravity, overDrag, underGravity, underDrag);
        addScaledVector(velocityPtr(thisJoint), forcePtr(thisJoint), 1.0 / getFloat(intervalMassPtr(thisJoint)));
        zero(forcePtr(thisJoint));
        add(velocityPtr(thisJoint), absorbVelocityPtr(thisJoint));
        zero(absorbVelocityPtr(thisJoint));
    }
    for (let thisInterval: u16 = 0; thisInterval < intervalCount; thisInterval++) {
        let alphaAltitude = getFloat(altitudePtr(getAlphaIndex(thisInterval)));
        let omegaAltitude = getFloat(altitudePtr(getOmegaIndex(thisInterval)));
        let straddle = (alphaAltitude > 0 && omegaAltitude <= 0) || (alphaAltitude <= 0 && omegaAltitude > 0);
        if (straddle) {
            let absAlphaAltitude = abs(alphaAltitude);
            let absOmegaAltitude = abs(omegaAltitude);
            let totalAltitude = absAlphaAltitude + absOmegaAltitude;
            if (totalAltitude > 0.001) {
                setVector(gravPtr, gravityPtr(getAlphaIndex(thisInterval)));
                lerp(gravPtr, gravityPtr(getOmegaIndex(thisInterval)), absOmegaAltitude / totalAltitude);
            }
            else {
                addVectors(gravPtr, gravityPtr(getAlphaIndex(thisInterval)), gravityPtr(getAlphaIndex(thisInterval)));
                multiplyScalar(gravPtr, 0.5);
            }
        }
        else {
            addVectors(gravPtr, gravityPtr(getAlphaIndex(thisInterval)), gravityPtr(getAlphaIndex(thisInterval)));
            multiplyScalar(gravPtr, 0.5);
        }
        add(velocityPtr(getAlphaIndex(thisInterval)), gravPtr);
        add(velocityPtr(getOmegaIndex(thisInterval)), gravPtr);
    }
    for (let thisJoint: u16 = 0; thisJoint < jointCount; thisJoint++) {
        add(locationPtr(thisJoint), velocityPtr(thisJoint));
        setFloat(intervalMassPtr(thisJoint), AMBIENT_JOINT_MASS);
    }
}

const AIR_DRAG: f32 = 0.001;
const AIR_GRAVITY: f32 = 0.000002;
const LAND_DRAG: f32 = 800;
const LAND_GRAVITY: f32 = 30;
const ELASTIC_FACTOR: f32 = 0.2;
const STRESS_MAX: f32 = 0.001;
const TIME_INDEX_STEP: u16 = 37;

export function iterate(ticks: usize): u16 {
    for (let thisTick: u16 = 0; thisTick < ticks; thisTick++) {
        tick(ELASTIC_FACTOR, AIR_GRAVITY, AIR_DRAG, LAND_GRAVITY, LAND_DRAG, TIME_INDEX_STEP);
    }
    let maxTimeIndex: u16 = 0;
    for (let intervalIndex: u16 = 0; intervalIndex < intervalCount; intervalIndex++) {
        setVector(outputAlphaLocationPtr(intervalIndex), locationPtr(getAlphaIndex(intervalIndex)));
        setVector(outputOmegaLocationPtr(intervalIndex), locationPtr(getOmegaIndex(intervalIndex)));
        let stress: f32 = 0;
        if (getTimeIndex(intervalIndex) !== 1) {
            stress = getFloat(stressPtr(intervalIndex)) / STRESS_MAX;
            if (stress > 1) {
                stress = 1;
            } else if (stress < -1) {
                stress = -1;
            }
        }
        let red: f32 = 0.6 + -stress * 0.4;
        let green: f32 = 0;
        let blue: f32 = 0.6 + stress * 0.4;
        setAll(outputAlphaColorPtr(intervalIndex), red, green, blue);
        setAll(outputOmegaColorPtr(intervalIndex), red, green, blue);
        if (getTimeIndex(intervalIndex) > maxTimeIndex) {
            maxTimeIndex = getTimeIndex(intervalIndex);
        }
    }
    for (let thisFace: u16 = 0; thisFace < faceCount; thisFace++) {
        outputFaceGeometry(thisFace);
    }
    return maxTimeIndex;
}
