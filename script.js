// OpenStreetMap Nominatim Search API
async function searchDestinations(query) {
    if (!query) return [];

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`,
            { headers: { 'Accept-Language': 'en' } }
        );

        if (!response.ok) throw new Error('API Request Failed');
        return await response.json();
    } catch (err) {
        console.error('Error fetching destinations:', err);
        throw err;
    }
}

// Wikimedia Commons Thumbnail Photo API
async function fetchPlaceImage(placeName) {
    try {
        const response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`
        );
        if (!response.ok) throw new Error('No Wikipedia article found');
        
        const data = await response.json();
        if (data.thumbnail && data.thumbnail.source) {
            return data.thumbnail.source;
        }
    } catch (e) {
        console.error('Wikimedia image fetch failed for:', placeName, e);
    }
    
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
}

const DEFAULT_PLACES = [
    {
        id: 'd1',
        name: 'Santorini',
        location: 'Greece',
        image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 'd2',
        name: 'Kyoto',
        location: 'Japan',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 'd3',
        name: 'Amalfi Coast',
        location: 'Italy',
        image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 'd4',
        name: 'Banff',
        location: 'Canada',
        image: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80'
    }
];

let myTrips = JSON.parse(localStorage.getItem('tripwise_my_trips')) || [];
let currentDisplayedPlaces = DEFAULT_PLACES; // Keeps track of currently rendered search results

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('se');
    const searchForm = document.getElementById('search-form');
    const destinationsContainer = document.getElementById('destinations');
    const sectionTitle = document.getElementById('h2');
    const tripsCount = document.getElementById('trips-count');
    const tripsModal = document.getElementById('trips-modal');
    const tripsList = document.getElementById('trips-list');
    const closeModal = document.getElementById('close-modal');
    const navTrips = document.getElementById('nav-trips');
    const navHome = document.getElementById('nav-home');
    const navExplore = document.getElementById('nav-explore');

    function updateTripsCount() {
        if (tripsCount) tripsCount.textContent = myTrips.length;
    }

    function renderPlaces(places) {
        currentDisplayedPlaces = places; // Save current list
        if (!destinationsContainer) return;
        destinationsContainer.innerHTML = '';

        if (!places || places.length === 0) {
            destinationsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 30px; color:#64748b; font-size:14px;">No destinations found. Try searching for another location!</div>`;
            return;
        }

        places.forEach(place => {
            const isSaved = myTrips.some(item => item.id === place.id);

            const box = document.createElement('div');
            box.className = 'box';
            box.style.backgroundImage = `url('${place.image}')`;

            box.innerHTML = `
                <button type="button" class="add-trip-btn ${isSaved ? 'saved' : ''}">
                    ${isSaved ? '✓ Saved' : '+ Add to Trip'}
                </button>
                <div class="box-title">${place.name}</div>
                <div class="box-sub">📍 ${place.location}</div>
            `;

            const addBtn = box.querySelector('.add-trip-btn');
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSavedTrip(place);
            });

            destinationsContainer.appendChild(box);
        });
    }

    function toggleSavedTrip(place) {
        const index = myTrips.findIndex(item => item.id === place.id);
        if (index > -1) {
            myTrips.splice(index, 1);
        } else {
            myTrips.push(place);
        }
        localStorage.setItem('tripwise_my_trips', JSON.stringify(myTrips));
        updateTripsCount();
        
        // Re-renders the CURRENT places list instead of resetting to DEFAULT_PLACES!
        renderPlaces(currentDisplayedPlaces);
        renderTripsModal();
    }

    function scrollToResults() {
        const destSection = document.querySelector('.dest') || destinationsContainer;
        if (destSection) {
            destSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async function searchPlacesFromAPI(query) {
        if (!query) {
            resetToPopular();
            return;
        }

        if (sectionTitle) sectionTitle.textContent = 'Result';

        if (destinationsContainer) {
            destinationsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 30px; color:#64748b; font-size:14px;">Searching places & photos...</div>`;
        }

        scrollToResults();

        try {
            const data = await searchDestinations(query);

            if (data.length === 0) {
                renderPlaces([]);
                return;
            }

            const results = await Promise.all(data.map(async (item) => {
                const placeName = item.display_name.split(',')[0];
                const imageUrl = await fetchPlaceImage(placeName);

                return {
                    id: String(item.place_id),
                    name: placeName,
                    location: item.display_name.split(',').slice(1, 3).join(',').trim() || 'Worldwide',
                    image: imageUrl
                };
            }));

            renderPlaces(results);
        } catch (err) {
            console.error('Error fetching destinations:', err);
            renderPlaces([]);
        }
    }

    function resetToPopular() {
        if (searchInput) searchInput.value = '';
        const dateInput = document.getElementById('se-date');
        const guestsInput = document.getElementById('se-guests');
        if (dateInput) dateInput.value = '';
        if (guestsInput) guestsInput.value = '';

        if (sectionTitle) sectionTitle.textContent = 'Popular Destinations';
        renderPlaces(DEFAULT_PLACES);
    }

    function renderTripsModal() {
        if (!tripsList) return;

        if (myTrips.length === 0) {
            tripsList.innerHTML = `<p style="color:#64748b; font-size:13px; text-align:center; padding: 10px;">Your saved trips list is empty. Click "+ Add to Trip" on any destination card!</p>`;
            return;
        }

        tripsList.innerHTML = myTrips.map(item => `
            <div class="trip-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="trip-info">
                    <div class="trip-name">${item.name}</div>
                    <div class="trip-loc">📍 ${item.location}</div>
                </div>
                <button type="button" class="remove-btn" onclick="removeTrip('${item.id}')">Remove</button>
            </div>
        `).join('');
    }

    window.removeTrip = function(id) {
        myTrips = myTrips.filter(item => item.id !== id);
        localStorage.setItem('tripwise_my_trips', JSON.stringify(myTrips));
        updateTripsCount();
        renderTripsModal();
        renderPlaces(currentDisplayedPlaces);
    };

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput ? searchInput.value.trim() : '';
            searchPlacesFromAPI(query);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (!e.target.value.trim() && sectionTitle) {
                sectionTitle.textContent = 'Popular Destinations';
                renderPlaces(DEFAULT_PLACES);
            }
        });
    }

    if (navTrips) {
        navTrips.addEventListener('click', (e) => {
            e.preventDefault();
            renderTripsModal();
            if (tripsModal) tripsModal.style.display = 'flex';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (tripsModal) tripsModal.style.display = 'none';
        });
    }

    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            resetToPopular();
        });
    }

    if (navExplore) {
        navExplore.addEventListener('click', (e) => {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        });
    }

    window.addEventListener('click', (e) => {
        if (tripsModal && e.target === tripsModal) {
            tripsModal.style.display = 'none';
        }
    });

    updateTripsCount();
    renderPlaces(DEFAULT_PLACES);
});s