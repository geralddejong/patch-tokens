import {Gotch} from './gotch';
import {Color, Face3, Vector3} from 'three';
import {HUNG_ALTITUDE} from '../gotchi/population';

const SCALEX = 8.66;
const SCALEY = 15;

export interface ICoords {
    x: number;
    y: number;
}

export interface ISpotContext {
    faces: Face3[];
    vertices: Vector3[];
    owner: string;
    singleGotch: boolean;
}

const WATER_COLOR = new Color('darkturquoise');
const LAND_COLOR = new Color('tan');
const HANGER_BASE = 0.7;
const SIX = 6;
const UP = new Vector3(0, 1, 0);
const HEXAGON_POINTS = [
    new Vector3(0, 0, -10),
    new Vector3(-8.66, 0, -5),
    new Vector3(-8.66, 0, 5),
    new Vector3(0, 0, 10),
    new Vector3(8.66, 0, 5),
    new Vector3(8.66, 0, -5),
    new Vector3()
];

export class Spot {
    public scaledCoords: ICoords;
    public land = false;
    public free = false;
    public memberOfGotch: Gotch[] = [];
    public adjacentGotches: Gotch[] = [];
    public centerOfGotch?: Gotch;
    public faceIndexes: number[] = [];

    constructor(public coords: ICoords) {
        this.scaledCoords = {x: coords.x * SCALEX, y: coords.y * SCALEY};
    }

    get canBeNewGotch(): boolean {
        return !this.centerOfGotch && this.adjacentGotches.length > 0;
    }

    public updateFreeFlag() {
        this.free = !this.memberOfGotch.find(gotch => !!gotch.owner);
    }

    public addSurfaceGeometry(index: number, context: ISpotContext) {
        context.vertices.push(...HEXAGON_POINTS.map(hexPoint => new Vector3(
            hexPoint.x + this.scaledCoords.x,
            hexPoint.y,
            hexPoint.z + this.scaledCoords.y
        )));
        const normalSpread = this.land ? 0.04 : -0.02;
        for (let a = 0; a < SIX; a++) {
            const offset = index * HEXAGON_POINTS.length;
            const b = (a + 1) % SIX;
            const vertexNormals = [
                UP,
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[a], normalSpread).normalize(),
                new Vector3().add(UP).addScaledVector(HEXAGON_POINTS[b], normalSpread).normalize()
            ];
            const color = this.land ? LAND_COLOR : WATER_COLOR;
            this.faceIndexes.push(context.faces.length);
            context.faces.push(new Face3(offset + SIX, offset + a, offset + b, vertexNormals, color));
        }
    }

    public addHangerGeometry(context: ISpotContext) {
        for (let a = 0; a < SIX; a++) {
            const hexPoint = HEXAGON_POINTS[a];
            context.vertices.push(new Vector3(
                this.scaledCoords.x,
                HUNG_ALTITUDE,
                this.scaledCoords.y
            ));
            context.vertices.push(new Vector3(
                hexPoint.x * HANGER_BASE + this.scaledCoords.x,
                hexPoint.y,
                hexPoint.z * HANGER_BASE+ this.scaledCoords.y
            ));
        }
    }

    // private get hoverSomething() {
    //     return !!this.centerOfGotch || this.canBeNewGotch || this.free;
    // }
}

export const coordSort = (a: ICoords, b: ICoords): number => a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0;
export const sortSpotsOnCoord = (a: Spot, b: Spot): number => coordSort(a.coords, b.coords);
export const zero: ICoords = {x: 0, y: 0};
export const equals = (a: ICoords, b: ICoords): boolean => a.x === b.x && a.y === b.y;
export const minus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x - b.x, y: a.y - b.y};
};
export const plus = (a: ICoords, b: ICoords): ICoords => {
    return {x: a.x + b.x, y: a.y + b.y};
};
const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + '0') : s;
export const spotsToString = (spots: Spot[]) => {
    const lit = spots.map(spot => spot.land ? '1' : '0');
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join('') : null)
    const nybbleChars = nybbleStrings.map(chunk => {
        if (chunk) {
            return parseInt(padRightTo4(chunk), 2).toString(16);
        } else {
            return '';
        }
    });
    return nybbleChars.join('');
};