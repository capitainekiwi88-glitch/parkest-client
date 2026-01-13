<script lang="ts">
  import { Geolocation } from '@capacitor/geolocation'
  import { Router, type RouteConfig } from "@mateothegreat/svelte5-router";
  import "@maptiler/sdk/dist/maptiler-sdk.css";
  import Position from './position';
  import Map from './map';
  import { Parking } from './parking';
  import { LngLat } from '@maptiler/sdk';
  import { onMount } from 'svelte';
  import Navbar from './components/Navbar.svelte';
  import Home from './routes/Home.svelte';
  import RoutingComponent from './components/Routing.svelte';
  import LoginRegisterForm from './components/LoginRegisterForm.svelte';
  import { get } from 'svelte/store';
  import { routingState } from './stores/routingStore';
  import { mapStore } from './stores/mapStore';
  import { UserContent } from './stores/userStore';

  let hasArrived = false;
  let isInitialLoading = true;

  const routes: RouteConfig[] = [
    {
      component: Home,
    }
  ];

  const deviceHeight = window.innerHeight;
  const deviceWidth = window.innerWidth;
  let openSideMenu = false;
  let showNoResultWarning = false;
  let locationError = false;
  let locationErrorMessage = "";
  const position: Position = new Position();
  const parking = new Parking();

  // Clear route when routing component is closed
  $: if (!$routingState.isVisible) {
    const currentMap = get(mapStore);
    if (currentMap) {
      currentMap.clearRoute();
    }
    hasArrived = false;
  }

  // refresh markers when dspOnly changes and map exists
  $: if ($mapStore && $UserContent) {
    (async () => {
      if (parking.parkings.length === 0 && parking.parkingsDsp.length === 0) {
        return;
      }
      try {
        const prefs = [
          $UserContent.free ? 1 : 0,
          $UserContent.pmr ? 1 : 0,
          $UserContent.elec ? 1 : 0
        ];
        const LngLatActuel = new LngLat(position.longitude, position.latitude);
        let filtered = parking.getNearParkings(
          LngLatActuel,
          $UserContent.dspOnly,
          30000, // Rayon
          prefs
        );

        if (filtered.length === 0 && !isInitialLoading) {
          showNoResultWarning = true;
          setTimeout(() => { showNoResultWarning = false; }, 3000);  
        } else {
          showNoResultWarning = false;
        }
        $mapStore.clearParkingMarkers();
        $mapStore.setParkingMarkers(filtered);
        $mapStore.drawRoute($routingState.LngLat.lng, $routingState.LngLat.lat, $routingState.destination);
      } catch (e) {
        console.error("Erreur rafraîchissement parkings", e);
      }
    })();
  }

  async function mapInit() {
    console.log('mapInit started');
    
    // Ensure permissions are checked/requested before proceeding
    try {
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        const requestStatus = await Geolocation.requestPermissions();
      }
    } catch (e) {
      console.error('Error checking permissions in mapInit', e);
    }

    console.log('Creating new Map instance');
    const map = new Map('map');
    mapStore.set(map);
    
    try {
      await position.getPosition();
      map.longitude = position.longitude;
      map.latitude = position.latitude;
      locationError = false;
    } catch (e) {
      locationError = true;
      locationErrorMessage = "Impossible de déterminer votre position GPS";
      console.error('Could not get initial position', e);
      position.longitude = 6.1757; // Pour afficher les parkings même sans position (TEST SEULEMENT - A SUPPRIMER)
      position.latitude = 49.1193; // IDEM  ----------------------------------------------------------------------
      map.longitude =  6.1757; 
      map.latitude = 49.1193;
    }

    map.loadMap();
    position.setWatcher((lat: number, lng: number) => {
      
      map!.setPosition(lat, lng);
      const currentRoute = get(routingState);

      if (currentRoute.isVisible && currentRoute.LngLat && !hasArrived) {
        const userLocation = new LngLat(lng, lat);
        const destinationLocation = new LngLat(currentRoute.LngLat.lng, currentRoute.LngLat.lat);
        const distance = userLocation.distanceTo(destinationLocation);

        if (distance < 40) {
          hasArrived = true;
          triggerArrivalAnimation(map,destinationLocation);
          console.log("Vous êtes arrivé à destination !");
        }
      }
    });

    await parking.fetchParkings();
    isInitialLoading = false;
    console.log(parking.parkings.length + ' parkings loaded');
    const largeRadius = 50000; 
    map.setParkingMarkers(parking.getNearParkings(new LngLat(position.longitude, position.latitude), $UserContent.dspOnly, largeRadius, [0,0,0]));
    
  }

  function triggerArrivalAnimation(mapInstance: any, target: LngLat) {
    if (!mapInstance || !mapInstance.map) return;
    mapInstance.map.flyTo({
        center: target,
        zoom: 18,
        pitch: 60,
        bearing: -45,
        speed: 0.8,
        essential: true
    });
  }

  onMount(() => {
    if ($UserContent.token !== "") {
      (async () => {
        await $UserContent.fetchParams();
        UserContent.update(n => n);
        await mapInit();
      })();
    }
  });

</script>

<main class="flex flex-col justify-center items-center" style="height: {deviceHeight}px; width: {deviceWidth}px; ">

  {#if showNoResultWarning}
    <div class="absolute top-20 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold transition-opacity">
      <i class="fa-solid fa-circle-exclamation mr-2"></i>
      Aucun parking ne correspond à vos filtres.
    </div>
  {/if}
  {#if locationError}
    <div class="absolute top-5 z-50 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border-2 border-white animate-bounce">
      <i class="fa-solid fa-location-dot"></i>
      <div class="text-sm">
        <p class="font-bold">{locationErrorMessage}</p>
        <p class="text-xs opacity-90">Affichage des parkings par défaut (Londres).</p>
      </div>
      <button on:click={() => locationError = false} aria-label="Fermer l'avertissement" class="ml-2">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}
  {#if $UserContent.token === ""}

    <LoginRegisterForm UserContent={UserContent} />

  {:else}

    <Navbar bind:open={openSideMenu} />

    {#if $routingState.isVisible}
      <RoutingComponent destination={$routingState.destination} />
    {/if}

    <Router {routes} />

  {/if}
</main>