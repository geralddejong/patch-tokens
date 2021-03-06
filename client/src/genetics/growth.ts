import {Fabric} from "../body/fabric"
import {FaceSnapshot} from "../body/face-snapshot"

import {GeneReader} from "./gene-reader"

const UNFOLD_JOINT = 2
const FACE_AHEAD = 2

export class Growth {

    private growingFaces: FaceSnapshot [] = []

    constructor(private fabric: Fabric, private growthGene: GeneReader) {
        this.growingFaces.push(fabric.getFaceSnapshot(0))
        this.growingFaces.push(fabric.getFaceSnapshot(2))
        this.growingFaces.push(fabric.getFaceSnapshot(4))
    }

    public step(): boolean {
        const freshFaces: FaceSnapshot[] = []
        for (let growingFace = 0; growingFace < this.growingFaces.length; growingFace++) {
            const count: number = 1 + this.growthGene.chooseFrom(3)
            if (count < 3) { // maybe go crooked
                const unfoldJoint = this.growingFaces[growingFace].isDerived ? UNFOLD_JOINT : this.growthGene.chooseFrom(3)
                const unfoldedFaces = this.fabric.unfold(this.growingFaces[growingFace].fresh.index, unfoldJoint)
                const nextFace: number = this.growthGene.chooseFrom(2)
                if (unfoldedFaces.length > 0) {
                    this.growingFaces[growingFace] = unfoldedFaces[nextFace]
                }
                freshFaces.push(...unfoldedFaces)
            } else {
                for (let x = 0; x < count; x++) {
                    const faceIndex = this.growingFaces[growingFace].fresh.index
                    const unfoldedFaces = this.fabric.unfold(faceIndex, UNFOLD_JOINT)
                    if (unfoldedFaces.length > 0) {
                        this.growingFaces[growingFace] = unfoldedFaces[FACE_AHEAD]
                    }
                    freshFaces.push(...unfoldedFaces)
                }
            }
        }
        return freshFaces.length > 0
    }
}
