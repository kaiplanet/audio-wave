import * as THREE from "three";

interface IWaveSource {
    amplitude: number;
    timestamp: number;
    position: THREE.Vector2;
    period: number;
}

interface IConstructorParams {
    amplitude: number;
    timestamp: number;
    position: THREE.Vector2;
    period: number;
}

export default class implements IWaveSource {
    public amplitude: number;
    public timestamp: number;
    public position: THREE.Vector2;
    public period: number;

    constructor({ amplitude, timestamp, position, period }: IConstructorParams) {
        this.amplitude = amplitude;
        this.timestamp = timestamp;
        this.position = position;
        this.period = period;
    }
}
