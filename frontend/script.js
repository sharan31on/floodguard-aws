const API_URL =
    "https://yc33qmalpf.execute-api.ap-south-1.amazonaws.com/locations";

const locations = {};

const riskSettings = {
    "HEAVY RAINFALL": {
        className: "high",
        label: "HEAVY RAINFALL"
    },
    CAUTION: {
        className: "warning",
        label: "CAUTION"
    },
    MONITOR: {
        className: "safe",
        label: "MONITOR"
    },
    "DATA UNAVAILABLE": {
        className: "warning",
        label: "DATA UNAVAILABLE"
    }
};

const riskTitle = document.getElementById("current-risk");
const riskLocation = document.getElementById("current-location");
const recommendation = document.getElementById("safety-recommendation");
const rainfallDisplay = document.getElementById("rainfall");
const waterLevelDisplay = document.getElementById("water-level");
const locationCards = document.getElementById("location-cards");
const updatedTime = document.getElementById("updated-time");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatValue(value, suffix = "") {
    return typeof value === "number"
        ? `${value}${suffix}`
        : "Unavailable";
}

function getRisk(riskName) {
    return riskSettings[riskName] || riskSettings["DATA UNAVAILABLE"];
}

function renderLocationCards() {
    locationCards.innerHTML = Object.entries(locations).map(([key, place]) => {
        const risk = getRisk(place.risk);

        return `
            <article class="location-card ${risk.className}"
                data-location="${escapeHTML(key)}"
                tabindex="0"
                role="button"
                aria-label="View ${escapeHTML(place.name)} weather data"
                aria-pressed="false">
                <div class="card-top">
                    <h3>${escapeHTML(place.name)}</h3>
                    <span class="risk-tag ${risk.className}">
                        ${escapeHTML(risk.label)}
                    </span>
                </div>
                <p class="card-measurement">
                    Modelled rainfall (24h)<br>
                    <strong>${escapeHTML(formatValue(place.rainfall, " mm"))}</strong>
                </p>
                <p class="card-measurement">
                    Water level<br>
                    <strong>${escapeHTML(formatValue(place.waterLevel, " cm"))}</strong>
                </p>
                <p class="card-measurement">
                    Temperature<br>
                    <strong>${escapeHTML(formatValue(place.temperature, " °C"))}</strong>
                </p>
            </article>
        `;
    }).join("");
}

function updateDashboard(locationKey) {
    const place = locations[locationKey];

    if (!place) return;

    const risk = getRisk(place.risk);

    riskTitle.textContent = risk.label;
    riskLocation.textContent = `${place.name}, Tamil Nadu`;
    rainfallDisplay.textContent = formatValue(place.rainfall, " mm");
    waterLevelDisplay.textContent = formatValue(place.waterLevel, " cm");
    recommendation.textContent = place.recommendation ||
        "Continue monitoring weather and official local advisories. Lower rainfall does not guarantee flood safety.";

    document.querySelectorAll(".location-card").forEach(card => {
        const selected = card.dataset.location === locationKey;
        card.classList.toggle("selected", selected);
        card.setAttribute("aria-pressed", String(selected));
    });
}

async function loadLocations() {
    locationCards.textContent = "Loading weather-model data...";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.locations)) {
            throw new Error("Unexpected API response format.");
        }

        data.locations.forEach(item => {
            const key = item.location.toLowerCase();

            locations[key] = {
                name: item.location,
                rainfall: item.modelled_precipitation_last_24h_mm,
                waterLevel: item.water_level_cm,
                temperature: item.temperature_c,
                risk: item.risk,
                recommendation: item.recommendation
            };
        });

        renderLocationCards();

        const firstLocation = Object.keys(locations)[0];

        if (firstLocation) {
            updateDashboard(firstLocation);
        }

        if (updatedTime) {
            const fetchedAt = data.locations
                .map(item => item.fetched_at_utc)
                .filter(Boolean)
                .sort()
                .pop();

            updatedTime.textContent = fetchedAt
                ? `Weather data timestamp: ${fetchedAt}`
                : "Weather data retrieved from Open-Meteo";
        }

        console.info("FloodGuard weather data loaded:", data);
    } catch (error) {
        console.error("FloodGuard loading error:", error);

        locationCards.textContent =
            "Weather data is temporarily unavailable. Please try again later.";

        riskTitle.textContent = "DATA UNAVAILABLE";
        riskLocation.textContent = "Weather data could not be loaded";
        rainfallDisplay.textContent = "Unavailable";
        waterLevelDisplay.textContent = "Unavailable";
        recommendation.textContent =
            "Check official local weather and flood advisories. This dashboard is not an official warning system.";
    }
}

locationCards.addEventListener("click", event => {
    const card = event.target.closest(".location-card");

    if (card) {
        updateDashboard(card.dataset.location);
    }
});

locationCards.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest(".location-card");

    if (!card) return;

    event.preventDefault();
    updateDashboard(card.dataset.location);
});

document.querySelectorAll(".location-btn").forEach(button => {
    button.addEventListener("click", () => {
        updateDashboard(button.dataset.location.toLowerCase());
    });
});

loadLocations();
