'use strict';

//prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

///////////////////////////////////////////////////////////////////////////////////////////////////////
// CLASSES
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //if created same time --> ids are the same. Should use external library
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // array of [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
// APP ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteWorkout = document.querySelectorAll('.btn__delete__workout');
const btnDeleteAllWorkouts = document.querySelector('.delete__all__workouts');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  popups = [];

  constructor() {
    // Get users position
    this.#getPosition();

    // Get local storage
    this.#getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this.#newWorkout.bind(this)); // inside eventListener/eventHandler this=DOM element that it is attached, in this case => form!!! thats why binding is needed

    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));

    // Delete all workouts
    btnDeleteAllWorkouts.addEventListener(
      'click',
      this.deleteAllWorkouts.bind(this)
    );

    // this should be outside...cus outside workss...
    // document
    //   .querySelectorAll('.btn__delete__workout')
    //   .forEach(function (button) {
    //     button.addEventListener('click', function () {
    //       const workoutId = this.closest('.workout').dataset.id;
    //       console.log('deleting');
    //       this.deleteWorkout(workoutId).bind(this);
    //       //app.deleteWorkout();
    //     });
    //   });
  }

  #getPosition() {
    //Geolocation API - navigator.geolocation.getCurrentPosition(1st callback success, 2nd callback)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this), //have to bind cus getCurrentPosition is calling #loadMap (as a regular function not method) and in that case this = undefined)
        function () {
          alert('Could not get your position!');
        }
      );
    }
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    //console.log(this); //undefined
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //L is kind of a namespace, like Intl. L has couple of methods. comes frome leaflet library, Leaflet library is added in html

    // Map is made out of small tiles
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this.#showForm.bind(this)); //if not bind -> error: Cannot write private memebet #mapEvent to an object whose class did not declare it, reason again - incorrect this=> this = map itself (this is an event handler f)

    // Render markers (from local storage)
    this.#workouts.forEach(work => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Add hidden class
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const checkPositiveNum = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // -> Running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data valid
      if (
        !validInputs(distance, duration, cadence) ||
        !checkPositiveNum(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // -> Cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data valid
      if (
        !validInputs(distance, duration, elevation) ||
        !checkPositiveNum(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new obj to workout array
    this.#workouts.push(workout);

    // Render workout on the map as marker
    this.#renderWorkoutMarker(workout);

    // Render workout on the list
    this.#renderWorkout(workout);

    // Clear input fields
    this.#hideForm();

    //Set local storage to lal workouts
    this.#setLocalStorage();

    location.reload();
  }

  // Render workout marker
  #renderWorkoutMarker(workout) {
    L.marker(workout.coords, { opacity: 0.8 })
      .addTo(this.#map)
      .bindPopup(
        L.popup(workout.coords, {
          maxWidth: 300,
          minWidth: 80,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="btn__delete__workout" >
            <ion-icon class="icon__delete" name="trash-outline"></ion-icon>
          </button>
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
          </div>
          `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout'); //everything will end up in li element, it includes id

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click(); - disabled cus Local storage objects are not an instance Of Running/Cycling(Workout) class
  }

  #setLocalStorage() {
    // Local storage is an API that browser provides for us. Its key-value store. Is is only advised to use for small amounts.
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); // but these objects do not have Workout->Runnning/Cycling prototype

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this.#renderWorkout(work);
      //this.#renderWorkoutMarker(work); //does not work cus map has not loaded
    });

    // Add Delete All Workuts Btn
    if (this.#workouts.length > 0) this.#addBtnDeleteAllWorkouts();
  }

  deleteWorkout(id) {
    let indexToDelete = this.#workouts.findIndex(workout => workout.id === id);
    console.log('workouts bef: :', this.#workouts);
    this.#workouts.splice(indexToDelete, 1);
    console.log('after ', this.#workouts);
    this.#setLocalStorage();

    if (this.#workouts.length === 0) this.#removeBtnDeleteAllWorkouts();

    location.reload();
  }

  reset() {
    localStorage.removeItem('workouts');
    // Reloading page, Location - a big obj that has multiple methods in the browser
    location.reload();
  }

  #addBtnDeleteAllWorkouts() {
    btnDeleteAllWorkouts.classList.remove('hidden__btn');
  }

  #removeBtnDeleteAllWorkouts() {
    btnDeleteAllWorkouts.classList.add('hidden__btn');
  }

  deleteAllWorkouts() {
    this.#removeBtnDeleteAllWorkouts();
    this.reset();
  }

  reload() {
    location.reload();
  }
}

// Create an object of the class
const app = new App();

// Delete a specific workout
document.querySelectorAll('.btn__delete__workout').forEach(function (button) {
  button.addEventListener('click', function () {
    const workoutId = this.closest('.workout').dataset.id;
    app.deleteWorkout(workoutId).bind(app);
    //app.deleteWorkout();
  });
});

// // Delete all workouts
// btnDeleteAllWorkouts.addEventListener('click', app.deleteAllWorkouts.bind(app));
