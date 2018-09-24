import {IFabricExports} from '../body/fabric-exports';
import {Gotchi} from './gotchi';
import {Fabric} from '../body/fabric';
import {Genome, IGenome} from '../genetics/genome';
import {Raycaster, Vector3} from 'three';
import {Physics} from '../body/physics';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

export const HUNG_ALTITUDE = 7;
const HANG_DELAY = 3000;
const REST_DELAY = 2000;
const NORMAL_TICKS = 40;
const CATCH_UP_TICKS = 220;
const MAX_POPULATION = 16;
const INITIAL_JOINT_COUNT = 47;
const INITIAL_MUTATION_COUNT = 20;
const CHANCE_OF_GROWTH = 0.1;

const INITIAL_FRONTIER = 8;
const FRONTIER_EXPANSION = 1.1;

export interface IFrontier {
    radius: number;
}

interface IGotchiFitness {
    gotchi: Gotchi;
    index: number;
    distance: number;
}

const evaluateFitness = (gotchi: Gotchi, index: number): IGotchiFitness => {
    return {gotchi, index, distance: gotchi.distance};
};

const getFittest = (mutated: boolean): Genome | undefined => {
    const fittest = localStorage.getItem('fittest');
    const storedGenome: IGenome = fittest ? JSON.parse(fittest) : null;
    return storedGenome ? mutated ? new Genome(storedGenome).withMutatedBehavior(INITIAL_MUTATION_COUNT) : new Genome(storedGenome) : undefined;
};

export const setFittest = (gotchi: Gotchi) => {
    console.log('set fittest');
    localStorage.setItem('fittest', JSON.stringify(gotchi.genomeSnapshot));
};

export const clearFittest = () => {
    console.log('clear fittest');
    localStorage.removeItem('fittest');
};

export class Population {
    public frontier: BehaviorSubject<IFrontier> = new BehaviorSubject({radius: INITIAL_FRONTIER});
    private physicsObject = new Physics();
    private gotchiArray: Gotchi[] = [];
    private toBeBorn = 0;
    private mutationCount = INITIAL_MUTATION_COUNT;

    constructor(private createFabricInstance: () => Promise<IFabricExports>) {
        for (let walk = 0; walk < MAX_POPULATION; walk++) {
            this.birthFromGenome(getFittest(walk > 0));
        }
    }

    public get midpoint(): Vector3 {
        const gotchis = this.gotchiArray;
        return gotchis
            .map(gotchi => gotchi.fabric.midpoint)
            .reduce((prev, currentValue) => prev.add(currentValue), new Vector3())
            .multiplyScalar(1 / gotchis.length);
    }

    public get physics() {
        return this.physicsObject;
    }

    public applyPhysics() {
        this.gotchiArray.forEach(gotchi => gotchi.fabric.apply(this.physicsObject));
    }

    public get forDisplay(): Gotchi[] {
        return this.gotchiArray;
    }

    public iterate(): number[] {
        const maxAge = Math.max(...this.gotchiArray.map(gotchi => gotchi.age));
        const nursery: Gotchi[] = [];
        let minFrozenAge = maxAge;
        let maxFrozenAge = 0;
        let frozenNotExpectingCount = 0;
        const freeze = (gotchi: Gotchi) => {
            gotchi.frozen = true;
            if (!gotchi.expecting) {
                frozenNotExpectingCount++;
            }
            if (minFrozenAge > gotchi.age) {
                minFrozenAge = gotchi.age;
            }
            if (maxFrozenAge < gotchi.age) {
                maxFrozenAge = gotchi.age;
            }
        };
        let catchingUp = false;
        this.gotchiArray = this.gotchiArray.map((gotchi, index, array) => {
            if (gotchi.rebornClone) {
                return gotchi.rebornClone;
            }
            else if (gotchi.offspring) {
                nursery.push(gotchi.offspring);
                gotchi.offspring = undefined;
                return gotchi;
            }
            else if (gotchi.frozen) {
                freeze(gotchi);
                return gotchi;
            } else {
                if (gotchi.distance > this.frontier.getValue().radius) {
                    if (!array.find(g => g.frozen)) {
                        setFittest(gotchi);
                    }
                    freeze(gotchi);
                    this.toBeBorn++;
                }
                gotchi.catchingUp = false;
                if (gotchi.age + CATCH_UP_TICKS < maxAge) {
                    gotchi.iterate(CATCH_UP_TICKS);
                    catchingUp = gotchi.catchingUp = true;
                } else if (gotchi.age + NORMAL_TICKS * 3 < maxAge) {
                    gotchi.iterate(NORMAL_TICKS);
                    catchingUp = gotchi.catchingUp = true;
                }
                return gotchi;
            }
        });
        this.gotchiArray.push(...nursery);
        if (this.toBeBorn > 0) {
            this.toBeBorn--;
            this.birthFromPopulation();
        } else if (frozenNotExpectingCount > this.gotchiArray.length / 2) {
            this.gotchiArray.forEach(gotchi => this.createReplacement(gotchi, true));
            if (minFrozenAge * 3 > maxFrozenAge * 2) {
                const expandedRadius = this.frontier.getValue().radius * FRONTIER_EXPANSION;
                this.frontier.next({radius: expandedRadius});
                this.mutationCount--;
                console.log(`fontier = ${expandedRadius}, mutations = ${this.mutationCount}`);
            }
        }
        return this.gotchiArray.map(gotchi => {
            return gotchi.iterate(catchingUp ? NORMAL_TICKS / 3 : NORMAL_TICKS);
        });
    }

    public findGotchi(raycaster: Raycaster): Gotchi | undefined {
        return this.gotchiArray
            .filter(gotchi => gotchi.facesMeshNode)
            .find(gotchi => raycaster.intersectObject(gotchi.facesMeshNode).length > 0);
    }

    // Privates =============================================================

    private birthFromGenome(existingGenome?: Genome) {
        this.createBody(INITIAL_JOINT_COUNT).then(fabric => {
            const genome = existingGenome ? existingGenome : new Genome();
            this.gotchiArray.push(new Gotchi(fabric, genome, HANG_DELAY, REST_DELAY));
        });
    }

    private createReplacement(gotchi: Gotchi, clone: boolean): void {
        gotchi.expecting = true;
        const grow = !clone && gotchi.frozen && Math.random() < CHANCE_OF_GROWTH;
        if (grow) {
            console.log('grow!');
        }
        this.createBody(gotchi.fabric.jointCountMax + (grow ? 4 : 0)).then(fabric => {
            const freshGotchi = gotchi.withNewBody(fabric);
            gotchi.expecting = false;
            if (clone) {
                gotchi.rebornClone = freshGotchi;
            } else {
                freshGotchi.mutateBehavior(this.mutationCount);
                gotchi.offspring = freshGotchi;
            }
        });
    }

    private birthFromPopulation() {
        while (this.gotchiArray.length + 1 > MAX_POPULATION) {
            if (!this.death()) {
                console.log('death failed');
                break;
            }
        }
        const fertile = this.gotchiArray.filter(gotchi => !gotchi.catchingUp);
        if (fertile.length) {
            const luckyOne = fertile[Math.floor(fertile.length * Math.random())];
            this.createReplacement(luckyOne, false);
        }
    }

    private death(): boolean {
        if (this.gotchiArray.length > 0) {
            const fitness = this.gotchiArray.map(evaluateFitness);
            fitness.sort((a, b) => a.distance - b.distance);
            const mature = fitness.filter(f => !f.gotchi.catchingUp);
            if (mature.length) {
                const deadIndex = mature[0].index;
                const dead = this.gotchiArray[deadIndex];
                dead.fabric.dispose();
                this.gotchiArray.splice(deadIndex, 1);
                return true;
            } else {
                console.log('no mature gotchis to kill!')
            }
        }
        return false;
    }

    private createBody(jointCountMax: number): Promise<Fabric> {
        return this.createFabricInstance().then(fabricExports => {
            const fabric = new Fabric(fabricExports, jointCountMax);
            this.physicsObject.applyToFabric(fabricExports);
            // console.log('current physics', currentPhysics);
            fabric.createSeed(5, HUNG_ALTITUDE);
            fabric.iterate(1, true);
            return fabric;
        });
    }
}