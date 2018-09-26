import * as React from 'react';
import * as R3 from 'react-three';
import {Color, PerspectiveCamera, Vector3} from 'three';
import {Island} from '../island/island';
import {IslandComponent} from './island-component';
import {Spot} from '../island/spot';
import {SpotSelector} from './spot-selector';

interface IIslandViewProps {
    width: number;
    height: number;
    island: Island;
}

interface IIslandViewState {
    selectedSpot?: Spot;
    hoverSpot?: Spot;
}

const SUN_POSITION = new Vector3(0, 300, 200);
const CAMERA_POSITION = new Vector3(0, 500, 0);
const HEMISPHERE_COLOR = new Color(0.8, 0.8, 0.8);

export class IslandView extends React.Component<IIslandViewProps, IIslandViewState> {
    private selector: SpotSelector;
    private perspectiveCamera: PerspectiveCamera;

    constructor(props: IIslandViewProps) {
        super(props);
        const singleGotch = props.island.singleGotch;
        this.state = {
            hoverSpot: singleGotch ? singleGotch.center : undefined
        };
        // const loader = new TextureLoader();
        // this.floorMaterial = new MeshBasicMaterial({map: loader.load('/grass.jpg')});
        this.perspectiveCamera = new PerspectiveCamera(50, props.width / props.height, 1, 500000);
        const midpoint = props.island.midpoint;
        this.perspectiveCamera.position.add(CAMERA_POSITION.add(midpoint));
        this.perspectiveCamera.up.set(0, 0, 1).normalize();
        this.perspectiveCamera.lookAt(midpoint);
        window.addEventListener("keypress", (event: KeyboardEvent) => {
            console.log(event.code);
            switch (event.code) {
                case 'KeyM':
                    break;
                case 'KeyR':
                    break;
            }
        });
    }

    public componentDidMount() {
        this.selector = new SpotSelector(
            this.props.island,
            this.perspectiveCamera,
            this.props.width,
            this.props.height
        );
    }

    public componentDidUpdate(prevProps: Readonly<IIslandViewProps>, prevState: Readonly<IIslandViewState>, snapshot: any) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.perspectiveCamera.aspect = this.props.width / this.props.height;
            this.perspectiveCamera.updateProjectionMatrix();
            this.selector.setSize(this.props.width, this.props.height);
        }
    }

    public render() {
        return (
            <div id="island-view"
                 onMouseMove={e => this.spotHover(this.selector.getSpot(e))}
                 onMouseDownCapture={e => this.spotClicked(this.selector.getSpot(e))}>
                <R3.Renderer width={this.props.width} height={this.props.height}>
                    <R3.Scene width={this.props.width} height={this.props.height} camera={this.perspectiveCamera}>
                        <IslandComponent island={this.props.island}
                                         selectedGotch={this.state.hoverSpot ? this.state.hoverSpot.centerOfGotch : undefined}/>
                        <R3.PointLight key="Sun" distance="1000" decay="0.01" position={SUN_POSITION}/>
                        <R3.HemisphereLight name="Hemi" color={HEMISPHERE_COLOR}/>
                    </R3.Scene>
                </R3.Renderer>
            </div>
        );
    }

    // ==========================

    private spotClicked(spot?: Spot) {
        if (spot) {
            const singleGotch = this.props.island.singleGotch;
            if (singleGotch && singleGotch.center !== spot) {
                spot.land = !spot.land;
                const pattern = this.props.island.pattern;
                console.log(`Island(spots-size=${pattern.spots.length}, gotches-size=${pattern.gotches.length})`, pattern);

                // todo: do this somewhere else
                const existingOwner = localStorage.getItem('owner');
                const owner = existingOwner ? existingOwner : 'gumby';
                localStorage.setItem(owner, JSON.stringify(pattern));
                this.forceUpdate();
            }
        }
        console.log('clicked', spot);
    }

    private spotHover(spot?: Spot) {
        const singleGotch = this.props.island.singleGotch;
        if (!singleGotch) {
            if (spot !== this.state.hoverSpot) {
                this.setState({hoverSpot: spot});
            }
        }
    }
}

