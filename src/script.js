'use strict';

// prettier-ignore
// let mapE, map;

/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// WORKOUT DATA
/////////////////////////////////////////////////////////////////
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // km
    this.duration = duration; // h
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = this.distance / (this.duration / 60);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// APPILICATION
/////////////////////////////////////////////////////////////////
class App {
  #mapZoomLvl = 13;
  #workouts = [];
  #mapE;
  #map;
  workout;
  date = new Date();
  _displayDate(workout) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  constructor() {
    this._getPosition.call(this);
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._centerWorkout.bind(this));
  }

  _centerWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // in case of success
        this._loadMap.bind(this),

        // in case of unsuccessful
        function () {
          console.log('Browser could not get your location');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(coords);

    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);
    // console.log(map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: 'home-popup',
        })
      )
      .setPopupContent('Home')
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(w => {
      this._renderWorkoutMarker(w);
    });
  }

  _showForm(mapEvent) {
    this.#mapE = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.classList.add('hidden');
    form.style.display = 'none';

    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'grid';
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    event.preventDefault();

    //Helper Functions
    const isPositive = function (...inputs) {
      return inputs.every(input => input > 0);
      // console.log(...inputs);
    };

    const isNumber = function (...inputs) {
      return inputs.every(input => Number.isFinite(input));
      // console.log(...inputs);
    };

    // get data from form
    const type = inputType.value;
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;
    const { lat, lng } = this.#mapE.latlng;

    // check if data is valid
    // if workout is of type running, create running object
    if (type === 'running') {
      let cadence = +inputCadence.value;
      if (
        !isNumber(distance, duration, cadence) ||
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence) ||
        !isPositive(distance, duration)
        // !distance > 0 ||
        // !duration > 0
      ) {
        return alert('Enter a valid number please!');
      }
      this.workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is of type cycling, create cycling object
    if (type === 'cycling') {
      let elevationGain = +inputElevation.value;
      if (
        !isNumber(distance, duration, elevationGain) ||
        !isPositive(distance, duration)
      ) {
        return alert('Enter a valid number please!');
      }
      this.workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // add new object to workout array
    this.#workouts.push(this.workout);

    // console.log(this.#workouts);

    // render workout on map as marker
    this._renderWorkoutMarker(this.workout);

    // render workout on list
    this._renderWorkoutList(this.workout);

    // hide workout form on list + clear input fields
    this._hideForm();

    // store workout in local storage
    this._addToLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type[0].toUpperCase()}${workout.type.slice(
          1
        )} ${this._displayDate()}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.type[0].toUpperCase()}${workout.type.slice(
      1
    )} on ${this._displayDate(workout)}</h2>
        <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
        </div>`;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
      </div>
    <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence.toFixed(1)}</span>
    <span class="workout__unit">spm</span>
    </div>
    `;
    }
    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
    <span class="workout__icon">🗻</span>
    <span class="workout__value">${workout.elevationGain.toFixed(1)}</span>
    <span class="workout__unit">m</span>
    </div>
    `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    data.forEach(work => {
      if (work.type === 'running')
        this.workout = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence
        );
      if (work.type === 'cycling')
        this.workout = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain
        );
      this.#workouts.push(this.workout);
    });
    // console.log(data);
    // console.log(this.#workouts);

    this.#workouts.forEach(w => {
      this._renderWorkoutList(w);
    });
  }

  get reset() {
    localStorage.clear();
    location.reload();
  }

  _addToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
}
const app = new App();
