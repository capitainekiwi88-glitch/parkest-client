import { writable } from 'svelte/store';
import * as maptilersdk from '@maptiler/sdk';

export const routingState = writable({
    isVisible: false,
    destination: '',
    LngLat: { lng: 0, lat: 0 }
});