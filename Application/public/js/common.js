
const elements = document.querySelectorAll('.modal .delete, .modal .cancel-button, .show-modal');
const elementsArr = Array.prototype.slice.call(elements);
elementsArr.forEach(function(element) {
    element.addEventListener('click', function(e) {
        const modalId = element.dataset.target;
        const modal = document.getElementById(modalId);
        if(modal) modal.classList.toggle('is-active');
    });
})
