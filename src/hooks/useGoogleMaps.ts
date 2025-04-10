"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    googleMapsLoadingPromise?: Promise<boolean>;
    googleMapsScriptId?: string;
  }
}

// Create a unique script ID to ensure we can identify our script
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";

// Function to load Google Maps API once and return a promise
function loadGoogleMapsOnce(apiKey: string): Promise<boolean> {
  // If the API is already loaded, return resolved promise
  if (window.google && window.google.maps) {
    return Promise.resolve(true);
  }

  // If we already have a loading promise, return it
  if (window.googleMapsLoadingPromise) {
    return window.googleMapsLoadingPromise;
  }

  // Check if script already exists in the DOM
  if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
    // Script tag exists but hasn't loaded yet, create a new promise to track it
    window.googleMapsLoadingPromise = new Promise<boolean>(
      (resolve, reject) => {
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded);
            resolve(true);
          }
        }, 100);

        // Set a timeout to avoid infinite checking
        setTimeout(() => {
          clearInterval(checkLoaded);
          reject(new Error("Google Maps API load timeout"));
        }, 20000); // 20 seconds timeout
      }
    );

    return window.googleMapsLoadingPromise;
  }

  // Create a new promise to load the script
  window.googleMapsLoadingPromise = new Promise<boolean>((resolve, reject) => {
    // Create script element
    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    // Set window flag to indicate we're loading
    window.googleMapsLoaded = false;
    window.googleMapsScriptId = GOOGLE_MAPS_SCRIPT_ID;

    script.onload = () => {
      console.log("Google Maps API loaded successfully");
      window.googleMapsLoaded = true;
      resolve(true);
    };

    script.onerror = () => {
      console.error("Error loading Google Maps API");
      window.googleMapsLoaded = false;
      window.googleMapsLoadingPromise = undefined;
      reject(new Error("Failed to load Google Maps API"));
    };

    document.head.appendChild(script);
  });

  return window.googleMapsLoadingPromise;
}

// Keep track of active component instances using the hook
let activeInstances = 0;

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    // Increment active instances counter
    activeInstances++;
    console.log("Google Maps hook instance created, total:", activeInstances);

    // If the API is already loaded, set the state to loaded immediately
    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded");
      setIsLoaded(true);
      return;
    }

    let isMounted = true;

    // Load the Google Maps API
    console.log("Loading Google Maps API...");
    loadGoogleMapsOnce(apiKey)
      .then(() => {
        // Only update state if component is still mounted
        if (isMounted) {
          console.log("Setting isLoaded state to true");
          setIsLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Google Maps loading error:", error);
      });

    // Cleanup function
    return () => {
      isMounted = false;
      activeInstances--;
      console.log(
        "Google Maps hook instance destroyed, remaining:",
        activeInstances
      );

      // If this was the last component using Google Maps, we could clean up
      // But we'll keep the script loaded for better performance across page navigations
      if (activeInstances === 0) {
        console.log("All Google Maps instances unmounted");
      }
    };
  }, [apiKey]);

  return isLoaded;
}
