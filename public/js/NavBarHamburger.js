// This function animates the hamburger icon transition between the open and closed states

const navbarToggle = document.querySelector('.navbar-toggle');
const navbarMenu = document.querySelector('.navbar-menu');

// The function show or hide the navigation menu when the hamburger icon is clicked
navbarToggle.addEventListener('click', () => {
    navbarToggle.classList.toggle('active');
    navbarMenu.classList.toggle('active');
})