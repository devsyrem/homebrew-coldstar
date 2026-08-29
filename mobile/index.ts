// Polyfills must load before anything touches @solana/web3.js.
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
const g = globalThis as { Buffer?: typeof Buffer };
if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
