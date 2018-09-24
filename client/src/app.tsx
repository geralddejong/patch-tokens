import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {ControlPanel} from './view/control-panel';
import {IslandView} from './view/island-view';
import {Island} from './island/island';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
    island: Island;
}

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: IAppProps) {
        super(props);
        this.state = {
            population: new Population(props.createFabricInstance),
            island: new Island()
        };
    }

    public render() {
        return (
            <div className="App">
                <div className="gotchi-panel">
                    <IslandView width={window.innerWidth}
                                height={window.innerHeight * 0.96}
                                island={this.state.island}/>
                </div>
                {/*<div className="gotchi-panel">*/}
                {/*<GotchiView width={window.innerWidth}*/}
                {/*height={window.innerHeight * 0.96}*/}
                {/*population={this.state.population}/>*/}
                {/*</div>*/}
                <div className="control-panel">
                    <ControlPanel population={this.state.population}/>
                </div>
            </div>
        );
    }

}

export default App;
