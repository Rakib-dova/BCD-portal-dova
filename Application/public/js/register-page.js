
document.getElementById('check').onclick = function() {
  let btn = document.getElementById('next-btn');
  if (this.checked) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', 'disabled');
  }
}

document.getElementById('next-btn').onclick = function() {

  const elements = document.querySelectorAll('input[type="text"]');
  const elementsArr = Array.prototype.slice.call(elements);
  elementsArr.forEach(function(element) {
    const target = element.dataset.target;
    const td = document.getElementById(target);
    td.innerHTML = element.value;
  })

  const element_checkbox = document.querySelector('input[type="checkbox"]');
  const target_checkbox = element_checkbox.dataset.target;

  if(document.getElementById('form').checkValidity()) {

    if(element_checkbox.value == "on") {
      let td_ckeckbox = document.getElementById(target_checkbox);
      td_ckeckbox.innerHTML = "同意する"
      var modal = document.getElementById("confirmregister-modal");
      if(modal) modal.classList.toggle('is-active');
      return false;
    } else {
      //checkValidity()でバリデーションのため正常系では下記アラートは表示されない
      alert("利用規約への同意が必要です。")
      return false;
    }
  }
}


addEvent(document, "change", function(e, target) {
  instantValidation(target);
});

function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(type, function(e) {
      callback(e, e.target);
    }, false);
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, function(e) {
      callback(e, e.srcElement);
    });
  }
}

function shouldBeValidated(field) {
  return (
    !(field.getAttribute("readonly") || field.readonly) &&
    !(field.getAttribute("disabled") || field.disabled) &&
    (field.getAttribute("pattern") || field.getAttribute("required"))
  );
}

function instantValidation(field) {
  if (shouldBeValidated(field)) {
    var invalid =
      (field.getAttribute("required") && !field.value) ||
      (field.getAttribute("pattern") &&
        field.value &&
        !new RegExp(field.getAttribute("pattern")).test(field.value));
    if (!invalid && field.getAttribute("aria-invalid")) {
      field.removeAttribute("aria-invalid");
    } else if (invalid && !field.getAttribute("aria-invalid")) {
      field.setAttribute("aria-invalid", "true");
    }
  }
}