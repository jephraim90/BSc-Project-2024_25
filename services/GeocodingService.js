import axios from "axios";

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

class GeocodingService {
  async geocodeAddress(address) {
    try {
      if (!address) {
        throw new Error("Address is required");
      }

      console.log("Attempting to geocode address:", address);

      // Format address for better geocoding results with UK addresses
      let formattedAddress = address;

      // Format to work with UK specific addresses
      const ukPostcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
      const isUkAddress =
        ukPostcodeRegex.test(address) ||
        address.includes("England") ||
        address.includes("UK") ||
        address.includes("United Kingdom");

      if (isUkAddress) {
        // For UK addresses, try adding "UK" if not present to improve geocoding success
        if (!address.includes("UK") && !address.includes("United Kingdom")) {
          formattedAddress = `${address}, UK`;
        }
      }

      console.log("Using formatted address for geocoding:", formattedAddress);

      // Use OpenWeather's geocoding API
      const response = await axios.get(
        "https://api.openweathermap.org/geo/1.0/direct",
        {
          params: {
            q: formattedAddress,
            limit: 1,
            appid: API_KEY,
          },
        }
      );

      console.log("Geocoding API response:", response.data);

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        return {
          success: true,
          data: { lat, lon },
        };
      } else {
        // If first attempt fails, try alternative geocoding approaches

        // For UK addresses, try breaking it down and only using postcode
        if (isUkAddress) {
          const postcode = address.match(ukPostcodeRegex);
          if (postcode) {
            console.log("Trying geocoding with only postcode:", postcode[0]);

            const postcodeResponse = await axios.get(
              "https://api.openweathermap.org/geo/1.0/direct",
              {
                params: {
                  q: `${postcode[0]}, UK`,
                  limit: 1,
                  appid: API_KEY,
                },
              }
            );

            if (postcodeResponse.data && postcodeResponse.data.length > 0) {
              const { lat, lon } = postcodeResponse.data[0];
              return {
                success: true,
                data: { lat, lon },
              };
            }
          }
        }

        throw new Error("Location not found");
      }
    } catch (error) {
      console.log("Error geocoding address:", error);
      return {
        success: false,
        error: error.message || "Failed to geocode address",
      };
    }
  }

  /**
   * Get coordinates for a restaurant
   * @param {Object} restaurant - Restaurant object
   * @returns {Promise} - Object containing latitude and longitude
   */
  async getRestaurantCoordinates(restaurant) {
    try {
      // Check if restaurant already has coordinates in different formats

      if (
        restaurant.location &&
        restaurant.location.coordinates &&
        Array.isArray(restaurant.location.coordinates) &&
        restaurant.location.coordinates.length === 2
      ) {
        const [lon, lat] = restaurant.location.coordinates;
        return {
          success: true,
          data: { lat, lon },
        };
      }

      // Format 2: GeoJSON style
      if (
        restaurant.location &&
        restaurant.location.type === "Point" &&
        restaurant.location.coordinates &&
        Array.isArray(restaurant.location.coordinates) &&
        restaurant.location.coordinates.length === 2
      ) {
        const [lon, lat] = restaurant.location.coordinates;
        return {
          success: true,
          data: { lat, lon },
        };
      }

      // Format 3: Direct latitude/longitude properties
      if (
        restaurant.latitude !== undefined &&
        restaurant.longitude !== undefined
      ) {
        return {
          success: true,
          data: {
            lat: restaurant.latitude,
            lon: restaurant.longitude,
          },
        };
      }

      // Format 4: lat/lon properties
      if (restaurant.lat !== undefined && restaurant.lon !== undefined) {
        return {
          success: true,
          data: {
            lat: restaurant.lat,
            lon: restaurant.lon,
          },
        };
      }

      // Format 5: geocoordinates as an object
      if (
        restaurant.geocoordinates &&
        restaurant.geocoordinates.latitude !== undefined &&
        restaurant.geocoordinates.longitude !== undefined
      ) {
        return {
          success: true,
          data: {
            lat: restaurant.geocoordinates.latitude,
            lon: restaurant.geocoordinates.longitude,
          },
        };
      }

      // If no coordinates found, try to geocode the address
      if (restaurant.address) {
        const fullAddress = this.constructFullAddress(restaurant);
        const result = await this.geocodeAddress(fullAddress);

        if (result.success) {
          return result;
        }
      }

      // All attempts failed, use fallback
      console.log("All geocoding attempts failed, using fallback");
      return await this.getFallbackCoordinates(restaurant);
    } catch (error) {
      console.log("Error getting restaurant coordinates:", error);
      // Use fallback even in case of errors
      return await this.getFallbackCoordinates(restaurant);
    }
  }

  constructFullAddress(restaurant) {
    const addressParts = [];

    // Add the main address
    if (restaurant.address) {
      addressParts.push(restaurant.address);
    }

    // Add city
    if (restaurant.city) {
      addressParts.push(restaurant.city);
    }

    // Add state/province
    if (restaurant.state || restaurant.province) {
      addressParts.push(restaurant.state || restaurant.province);
    }

    // Add postal/zip code
    if (restaurant.postalCode || restaurant.zipCode) {
      addressParts.push(restaurant.postalCode || restaurant.zipCode);
    }

    // Add country
    if (restaurant.country) {
      addressParts.push(restaurant.country);
    } else {
      // If it looks like a UK address but doesn't have country, add UK
      const ukPostcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
      const addressString = addressParts.join(" ");
      if (
        ukPostcodeRegex.test(addressString) ||
        addressString.includes("England") ||
        addressString.includes("Scotland") ||
        addressString.includes("Wales") ||
        addressString.includes("Northern Ireland")
      ) {
        addressParts.push("UK");
      }
    }

    return addressParts.join(", ");
  }

  /**
   * Fallback method for when geocoding fails
   * @param {Object} restaurant - Restaurant object
   * @returns {Object} - Default coordinates for the city
   */
  async getFallbackCoordinates(restaurant) {
    try {
      // Check for city in the restaurant data
      let city = restaurant.city;

      // If no city found, try to extract from address
      if (!city && restaurant.address) {
        const addressParts = restaurant.address.split(",");
        // The city is often the second or third part of an address
        if (addressParts.length > 1) {
          city = addressParts[1].trim();
        }
      }

      // If still no city found, try to extract from full address based on postal code location
      if (!city && restaurant.address) {
        const ukPostcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
        const postcode = restaurant.address.match(ukPostcodeRegex);

        if (postcode) {
          // Try to determine city from postcode prefix
          const postcodePrefix = postcode[0].split(" ")[0];

          // Map of common UK postcode prefixes to cities
          const postcodePrefixMap = {
            AB: "Aberdeen",
            AL: "St Albans",
            B: "Birmingham",
            BA: "Bath",
            BB: "Blackburn",
            BD: "Bradford",
            BH: "Bournemouth",
            BL: "Bolton",
            BN: "Brighton",
            BR: "Bromley",
            BS: "Bristol",
            BT: "Belfast",
            CA: "Carlisle",
            CB: "Cambridge",
            CF: "Cardiff",
            CH: "Chester",
            CM: "Chelmsford",
            CO: "Colchester",
            CR: "Croydon",
            CV: "Coventry",
            CW: "Crewe",
            DA: "Dartford",
            DD: "Dundee",
            DE: "Derby",
            DG: "Dumfries",
            DH: "Durham",
            DL: "Darlington",
            DN: "Doncaster",
            DT: "Dorchester",
            DY: "Dudley",
            E: "London (East)",
            EC: "London (East Central)",
            EH: "Edinburgh",
            EN: "Enfield",
            EX: "Exeter",
            FK: "Falkirk",
            FY: "Blackpool",
            G: "Glasgow",
            GL: "Gloucester",
            GU: "Guildford",
            HA: "Harrow",
            HD: "Huddersfield",
            HG: "Harrogate",
            HP: "Hemel Hempstead",
            HR: "Hereford",
            HS: "Outer Hebrides",
            HU: "Hull",
            HX: "Halifax",
            IG: "Ilford",
            IP: "Ipswich",
            IV: "Inverness",
            KA: "Kilmarnock",
            KT: "Kingston upon Thames",
            KW: "Kirkwall",
            KY: "Kirkcaldy",
            L: "Liverpool",
            LA: "Lancaster",
            LD: "Llandrindod Wells",
            LE: "Leicester",
            LL: "Llandudno",
            LN: "Lincoln",
            LS: "Leeds",
            LU: "Luton",
            M: "Manchester",
            ME: "Rochester",
            MK: "Milton Keynes",
            ML: "Motherwell",
            N: "London (North)",
            NE: "Newcastle upon Tyne",
            NG: "Nottingham",
            NN: "Northampton",
            NP: "Newport",
            NR: "Norwich",
            NW: "London (North West)",
            OL: "Oldham",
            OX: "Oxford",
            PA: "Paisley",
            PE: "Peterborough",
            PH: "Perth",
            PL: "Plymouth",
            PO: "Portsmouth",
            PR: "Preston",
            RG: "Reading",
            RH: "Redhill",
            RM: "Romford",
            S: "Sheffield",
            SA: "Swansea",
            SE: "London (South East)",
            SG: "Stevenage",
            SK: "Stockport",
            SL: "Slough",
            SM: "Sutton",
            SN: "Swindon",
            SO: "Southampton",
            SP: "Salisbury",
            SR: "Sunderland",
            SS: "Southend-on-Sea",
            ST: "Stoke-on-Trent",
            SW: "London (South West)",
            SY: "Shrewsbury",
            TA: "Taunton",
            TD: "Galashiels",
            TF: "Telford",
            TN: "Tunbridge Wells",
            TQ: "Torquay",
            TR: "Truro",
            TS: "Middlesbrough",
            TW: "Twickenham",
            UB: "Southall",
            W: "London (West)",
            WA: "Warrington",
            WC: "London (West Central)",
            WD: "Watford",
            WF: "Wakefield",
            WN: "Wigan",
            WR: "Worcester",
            WS: "Walsall",
            WV: "Wolverhampton",
            YO: "York",
            ZE: "Lerwick",
            // Add more as needed
          };

          city = postcodePrefixMap[postcodePrefix] || "London"; // Default to London if unknown
        }
      }

      // If we have a city, geocode it
      if (city) {
        console.log("Using city fallback for geocoding:", city);
        const response = await axios.get(
          "https://api.openweathermap.org/geo/1.0/direct",
          {
            params: {
              q: `${city}, UK`,
              limit: 1,
              appid: API_KEY,
            },
          }
        );

        if (response.data && response.data.length > 0) {
          const { lat, lon } = response.data[0];
          return {
            success: true,
            data: { lat, lon },
          };
        }
      }

      // Final fallback: Default to central London coordinates
      console.log("Using default London coordinates as fallback");
      return {
        success: true,
        data: {
          lat: 51.5074,
          lon: -0.1278,
        },
      };
    } catch (error) {
      console.log("Error in fallback geocoding:", error);
      // If all else fails, return coordinates for London
      return {
        success: true,
        data: {
          lat: 51.5074,
          lon: -0.1278,
        },
      };
    }
  }

  /**
   * Calculate distance between two coordinate points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Find nearby locations based on coordinates and radius
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {Array} locations - Array of location objects with lat/lon properties
   * @returns {Array} - Filtered array of nearby locations with distance added
   */
  findNearbyLocations(lat, lon, radiusKm, locations) {
    return locations
      .filter((location) => {
        // Get location coordinates
        let locationLat, locationLon;

        if (location.lat && location.lon) {
          locationLat = location.lat;
          locationLon = location.lon;
        } else if (location.latitude && location.longitude) {
          locationLat = location.latitude;
          locationLon = location.longitude;
        } else if (location.location && location.location.coordinates) {
          [locationLon, locationLat] = location.location.coordinates;
        } else {
          return false; // Skip if no valid coordinates
        }

        // Calculate distance
        const distance = this.calculateDistance(
          lat,
          lon,
          locationLat,
          locationLon
        );

        // Add distance to the location object
        location.distance = distance;

        // Return true if within radius
        return distance <= radiusKm;
      })
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Test geocoding with a specific address
   * This can be called from a development screen or via console
   */
  async testGeocoding(address) {
    console.log("Testing geocoding with address:", address);

    try {
      // Try regular geocoding
      const result = await this.geocodeAddress(address);
      console.log("Geocoding result:", result);

      if (!result.success) {
        // If regular geocoding fails, test the UK-specific handling
        const ukResult = await this.geocodeAddress(address + ", UK");
        console.log("UK-specific geocoding result:", ukResult);

        if (!ukResult.success) {
          // Test with postal code extraction
          const ukPostcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
          const postcode = address.match(ukPostcodeRegex);

          if (postcode) {
            const postcodeResult = await this.geocodeAddress(
              postcode[0] + ", UK"
            );
            console.log("Postcode-only geocoding result:", postcodeResult);
          }
        }
      }

      return result;
    } catch (error) {
      console.log("Error in test geocoding:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new GeocodingService();
