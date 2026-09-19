
document.addEventListener('DOMContentLoaded',function(){

  var els = document.querySelectorAll('.reveal');

  var io = new IntersectionObserver(function(entries){

    entries.forEach(function(e){

      if(e.isIntersecting){

        e.target.classList.add('in');

        io.unobserve(e.target);

      }

    });

  },{threshold:0.12});


  els.forEach(function(el){io.observe(el);});

  document.querySelectorAll('.stats-grid .num').forEach(function(counter){
    var target = Number(counter.dataset.target);
    var suffix = counter.dataset.suffix || '';
    var startTime;
    var duration = 1200;

    function animateCounter(timestamp){
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      counter.textContent = Math.round(target * easedProgress) + suffix;

      if (progress < 1)
        window.requestAnimationFrame(animateCounter);
    }

    window.requestAnimationFrame(animateCounter);
  });

  var modal = document.getElementById('appointmentModal');
  var openButton = document.getElementById('openAppointmentModal');
  var closeButtons = [
    document.querySelector('.modal-close'),
    document.getElementById('closeAppointmentModal')
  ];
  var medicationInputs = document.querySelectorAll('input[name="medication"]');
  var medicationBox = document.getElementById('medicationBox');
  var form = document.getElementById('appointmentForm');
  var appointmentDate = document.getElementById('appointmentDate');
  var appointmentTime = document.getElementById('appointmentTime');
  var slotStatus = document.getElementById('slotStatus');
  var scriptUrl = 'https://script.google.com/macros/s/AKfycbxnsEVOn7JUSTLJkm1QG50AJlkZyu1C4bGb6ArIB1JDbfo8BTgTIBG-SrnscNOrjfwm/exec';
  var availableSlots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  var bookedSlots = {};
  var appointmentStep1 = document.getElementById('appointmentStep1');
  var appointmentStep2 = document.getElementById('appointmentStep2');
  var stepIndicator1 = document.getElementById('stepIndicator1');
  var stepIndicator2 = document.getElementById('stepIndicator2');
  var nextAppointmentStep = document.getElementById('nextAppointmentStep');
  var backAppointmentStep = document.getElementById('backAppointmentStep');
  var skipClinicalStep = document.getElementById('skipClinicalStep');
  var header = document.querySelector('header');
  var menuToggle = document.querySelector('.menu-toggle');
  var navigationLinks = document.querySelectorAll('nav a');
  function closeMenu(){

    header.classList.remove('menu-open');

    if (menuToggle)
      menuToggle.innerHTML = '&#9776;';
      menuToggle.setAttribute('aria-label', 'Open menu');
      menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle)

    menuToggle.addEventListener('click',
      function(){
        var isOpen = header.classList.toggle('menu-open');

        menuToggle.innerHTML = isOpen ? '&times;' : '&#9776;';
        menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        menuToggle.setAttribute('aria-expanded',String(isOpen));
      }
    );

  navigationLinks.forEach(function(link){
    link.addEventListener('click', function(){
      navigationLinks.forEach(function(item){
        item.classList.remove('active');
      });
      link.classList.add('active');
      closeMenu();
    });
  });

  function updateActiveNavigationLink(){
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navigationLinks.forEach(function(link){
      var linkTarget = link.getAttribute('href');
      var isCurrentPage = linkTarget === currentPage;
      var isHomeHash = currentPage === 'index.html' && !window.location.hash && linkTarget === 'index.html';
      link.classList.toggle('active', isCurrentPage || isHomeHash);
    });
  }

  updateActiveNavigationLink();
  window.addEventListener('hashchange', updateActiveNavigationLink);

  document.addEventListener('click', function(event){
    if (header.classList.contains('menu-open') && !header.contains(event.target))
      closeMenu();
  });

  window.addEventListener('resize', function(){
    if (window.innerWidth > 900)
      closeMenu();
  });

  
  function showAppointmentStep(stepNumber){
    var firstStep = stepNumber === 1;
    appointmentStep1.classList.toggle('active', firstStep);
    appointmentStep2.classList.toggle('active', !firstStep);
    stepIndicator1.classList.toggle('active', firstStep);
    stepIndicator2.classList.toggle('active', !firstStep);
    modal.scrollTop = 0;
  }

  function validatePatientDetails(){
    var requiredFields = ['name', 'age', 'phone', 'email', 'address', 'appointmentDate', 'appointmentTime', 'gender'];
    for (var i = 0; i < requiredFields.length; i++) {
      var field = document.getElementById(requiredFields[i]);
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function slotKey(date, time){
    return date + '|' + time;
  }

  function readLocalBookedSlots(){
    try {
      return JSON.parse(localStorage.getItem('drGuptaBookedSlots') || '{}');
    } catch (error) {
      return {};
    }
  }

  function formatSlotTime(time){
    var parts = time.split(':');
    var hour = Number(parts[0]);
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var displayHour = hour % 12 || 12;
    return displayHour + ':' + parts[1] + ' ' + suffix;
  }

  function renderAvailableSlots(){
    var date = appointmentDate.value;
    appointmentTime.innerHTML = '';

    if (!date) {
      appointmentTime.disabled = true;
      appointmentTime.add(new Option('Select a date first', ''));
      slotStatus.textContent = 'Choose a date to see available slots.';
      return;
    }

    if (new Date(date + 'T00:00:00').getDay() === 0) {
      appointmentTime.disabled = true;
      appointmentTime.add(new Option('Clinic is closed on Sundays', ''));
      slotStatus.textContent = 'Please choose Monday to Saturday.';
      return;
    }

    appointmentTime.add(new Option('Select an available slot', ''));
    var visibleSlots = availableSlots.filter(function(time){
      return !bookedSlots[slotKey(date, time)];
    });

    visibleSlots.forEach(function(time){
      appointmentTime.add(new Option(formatSlotTime(time), time));
    });
    appointmentTime.disabled = visibleSlots.length === 0;
    slotStatus.textContent = visibleSlots.length
      ? visibleSlots.length + ' slot' + (visibleSlots.length === 1 ? '' : 's') + ' available.'
      : 'No slots are available on this date.';
  }

  function loadBookedSlots(){
    bookedSlots = readLocalBookedSlots();
    renderAvailableSlots();
    fetch(scriptUrl + '?action=getBookedSlots')
      .then(function(response){ return response.json(); })
      .then(function(result){
        var remoteSlots = result.bookedSlots || result.data || [];
        if (Array.isArray(remoteSlots)) {
          remoteSlots.forEach(function(slot){
            if (slot.date && slot.time)
              bookedSlots[slotKey(slot.date, slot.time)] = true;
            else if (slot.appointmentDate && slot.appointmentTime)
              bookedSlots[slotKey(slot.appointmentDate, slot.appointmentTime)] = true;
          });
          renderAvailableSlots();
        }
      })
      .catch(function(){ /* Local bookings remain available if the shared endpoint is unavailable. */ });
  }

  appointmentDate.min = new Date().toISOString().split('T')[0];
  appointmentDate.addEventListener('change', renderAvailableSlots);
  loadBookedSlots();

  function resetAppointmentSteps(){
    showAppointmentStep(1);
    medicationBox.classList.remove('visible');
    renderAvailableSlots();
  }

  function openModal(){
    resetAppointmentSteps();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false' );
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute( 'aria-hidden', 'true' );
    document.body.style.overflow = '';
  }


  if (openButton)

  openButton.addEventListener( 'click', openModal);

  closeButtons.forEach(function(button){
    if (button)
      button.addEventListener('click', closeModal );
  });

  modal.addEventListener('click',
    function(event){
      if (event.target === modal)
        closeModal();
    }
  );


  document.addEventListener('keydown',
    function(event){

      if (
        event.key === 'Escape' && modal.classList.contains('open'))
        {
        closeModal();
      }

      if (event.key === 'Escape')
        closeMenu();
    }
  );

  nextAppointmentStep.addEventListener('click', function(){
    if (validatePatientDetails())
      showAppointmentStep(2);
  });

  backAppointmentStep.addEventListener('click', function(){
    showAppointmentStep(1);
  });

  medicationInputs.forEach(function(radio){

    radio.addEventListener(
      'change',
      function(){

        if (this.value === 'yes') {

          medicationBox.classList.add('visible');

        } else {

          medicationBox.classList.remove( 'visible');

          var textarea = document.getElementById('medicineDetails');

          if (textarea)  textarea.value = '';
        }
      }
    );
  });


  function getCheckedValues(name){
    return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function(input){ return input.value; })
      .join(', ');
  }
  
  function submitAppointment(){
    var medicationRadio = document.querySelector('input[name="medication"]:checked');
    var medicationDetails = document.getElementById('medicineDetails');
    var appointmentId = 'APT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    var value = function(id){
      var field = document.getElementById(id);
      return field ? field.value.trim() : '';
    };
    var selected = function(name){ var input = document.querySelector('input[name="' + name + '"]:checked'); return input ? input.value : ''; };
    var formData = {
      appointmentId:appointmentId,
      name:value('name'), age:document.getElementById('age').value, phone:value('phone'), address:value('address'),
      email:value('email'), gender:document.getElementById('gender').value, appointmentDate:document.getElementById('appointmentDate').value, appointmentTime:document.getElementById('appointmentTime').value,
      reasonForVisit:value('reasonForVisit'), dentalProblem:document.getElementById('dentalProblem').value, painLevel:document.getElementById('painLevel').value,
      previousDentalTreatment:document.getElementById('previousDentalTreatment').value,
      medication:medicationRadio ? medicationRadio.value : 'no',
      medicineDetails:medicationRadio && medicationRadio.value === 'yes' ? value('medicineDetails') : '',
      allergies:value('allergies'), medicalHistory:value('medicalHistory'), additionalClinicalDetails:value('additionalClinicalDetails'),
      smoking:document.querySelector('input[name="habitSmoking"]').checked ? 'Yes' : 'No',
      smokingFrequency:document.querySelector('select[name="habitSmokingFrequency"]').value,
      smokingDuration:document.querySelector('select[name="habitSmokingDuration"]').value,
      smokelessTobacco:document.querySelector('input[name="habitTobacco"]').checked ? 'Yes' : 'No',
      smokelessTobaccoFrequency:document.querySelector('select[name="habitTobaccoFrequency"]').value,
      smokelessTobaccoDuration:document.querySelector('select[name="habitTobaccoDuration"]').value,
      paanChewing:document.querySelector('input[name="habitPaan"]').checked ? 'Yes' : 'No',
      paanChewingFrequency:document.querySelector('select[name="habitPaanFrequency"]').value,
      paanChewingDuration:document.querySelector('select[name="habitPaanDuration"]').value,
      alcohol:document.querySelector('input[name="habitAlcohol"]').checked ? 'Yes' : 'No',
      alcoholFrequency:document.querySelector('select[name="habitAlcoholFrequency"]').value,
      alcoholDuration:document.querySelector('select[name="habitAlcoholDuration"]').value,
      cleaningType:getCheckedValues('cleaningType'), cleaningMethod:getCheckedValues('cleaningMethod'), brushingFrequency:selected('brushingFrequency'),
      cleaningMaterial:getCheckedValues('cleaningMaterial'), cleaningMaterialOther:value('cleaningMaterialOther'), brushingTime:selected('brushingTime'),
      toothbrushChangeFrequency:selected('toothbrushChangeFrequency'), durationOfCleaning:value('durationOfCleaning'), oralHygieneAid:getCheckedValues('oralHygieneAid')
    };
    fetch(scriptUrl,{method:'POST',body:new URLSearchParams(formData)})
      .then(function(response){ return response.text(); })
      .then(function(text){
        var result;
        try { result = JSON.parse(text); } catch(error) { throw new Error('Invalid response from Google Apps Script.'); }
        if (result.status === 'success') {
          bookedSlots[slotKey(appointmentDate.value, appointmentTime.value)] = true;
          localStorage.setItem('drGuptaBookedSlots', JSON.stringify(bookedSlots));
          alert('Appointment submitted successfully!');
          form.reset();
          resetAppointmentSteps();
          closeModal();
        } else {
          alert('Failed to submit: ' + (result.message || 'Unknown error'));
        }
      })
      .catch(function(error){ console.error('Submit error:', error); alert('Failed to submit appointment. ' + error.message); });
  }

  skipClinicalStep.addEventListener('click', submitAppointment);
  form.addEventListener('submit', function(event){ event.preventDefault(); submitAppointment(); });
});


document.addEventListener("DOMContentLoaded", function () {

  const carousel = document.getElementById("heroCarousel");

  if (!carousel) return;


  const slides = carousel.querySelectorAll(".hero-slide");

  const dots = carousel.querySelectorAll(".carousel-dot");

  const previousButton =
    carousel.querySelector(".carousel-prev");

  const nextButton =
    carousel.querySelector(".carousel-next");


  let currentSlide = 0;

  let autoPlay;


  /* =====================================================
     SHOW SLIDE
  ===================================================== */

  function showSlide(index) {

    if (index >= slides.length) {
      index = 0;
    }

    if (index < 0) {
      index = slides.length - 1;
    }


    slides.forEach(function (slide) {

      slide.classList.remove("active");

    });


    dots.forEach(function (dot) {

      dot.classList.remove("active");

    });


    slides[index].classList.add("active");

    dots[index].classList.add("active");


    currentSlide = index;

  }


  /* =====================================================
     NEXT
  ===================================================== */

  function nextSlide() {

    showSlide(currentSlide + 1);

  }


  /* =====================================================
     PREVIOUS
  ===================================================== */

  function previousSlide() {

    showSlide(currentSlide - 1);

  }


  /* =====================================================
     BUTTONS
  ===================================================== */

  nextButton.addEventListener(
    "click",
    function () {

      nextSlide();

      restartAutoPlay();

    }
  );


  previousButton.addEventListener(
    "click",
    function () {

      previousSlide();

      restartAutoPlay();

    }
  );


  /* =====================================================
     DOTS
  ===================================================== */

  dots.forEach(function (dot, index) {

    dot.addEventListener(
      "click",
      function () {

        showSlide(index);

        restartAutoPlay();

      }
    );

  });


  /* =====================================================
     AUTO PLAY
  ===================================================== */

  function startAutoPlay() {

    autoPlay = setInterval(
      nextSlide,
      4000
    );

  }


  function restartAutoPlay() {

    clearInterval(autoPlay);

    startAutoPlay();

  }


  /* Start */

  showSlide(0);

  startAutoPlay();


  /* =====================================================
     PAUSE WHEN MOUSE IS OVER IMAGE
  ===================================================== */

  carousel.addEventListener(
    "mouseenter",
    function () {

      clearInterval(autoPlay);

    }
  );


  carousel.addEventListener(
    "mouseleave",
    function () {

      startAutoPlay();

    }
  );


});

/* =========================================================
   WHY US — tap-to-flip cards (works alongside CSS hover-flip)
   ========================================================= */

document.addEventListener('click', function(event){

  var card = event.target.closest('.why-card');
  if (!card) return;

  var isFlipped = card.classList.toggle('is-flipped');
  card.setAttribute('aria-pressed', String(isFlipped));

});


// service section slider starts here 

/* =========================================================
   SERVICES HORIZONTAL SLIDER
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const slider = document.querySelector(".services-slider");
    const nextBtn = document.querySelector(".service-next");
    const prevBtn = document.querySelector(".service-prev");
    const dots = document.querySelectorAll(".service-dot");

    if (!slider) return;


    /* =====================================================
       SETTINGS
    ===================================================== */

    const AUTO_SLIDE_TIME = 2000;   // 2 seconds
    const SLIDE_DURATION = 800;    // smooth animation


    /* =====================================================
       GET ORIGINAL CARDS
    ===================================================== */

    let originalCards = Array.from(
        slider.querySelectorAll(".service-card")
    );

    const totalCards = originalCards.length;

    if (totalCards === 0) return;


    /* =====================================================
       CLONE CARDS
       
       We add clones after the original cards.
       This allows the slider to continue moving smoothly
       from the last card to the first card.
    ===================================================== */

    originalCards.forEach(function (card) {

        const clone = card.cloneNode(true);

        clone.classList.add("service-card-clone");

        slider.appendChild(clone);

    });


    /* =====================================================
       VARIABLES
    ===================================================== */

    let currentIndex = 0;

    let autoSlide = null;

    let isAnimating = false;


    /* =====================================================
       GET CARD STEP
    ===================================================== */

    function getCardStep() {

        const card = slider.querySelector(".service-card");

        if (!card) return 0;

        const cardWidth = card.getBoundingClientRect().width;

        const sliderStyle = window.getComputedStyle(slider);

        const gap = parseFloat(sliderStyle.gap) || 0;

        return cardWidth + gap;
    }


    /* =====================================================
       UPDATE DOTS
    ===================================================== */

    function updateDots() {

        if (!dots.length) return;

        /*
         * We have only 5 dots in the HTML.
         * The dots represent the general slider position.
         */

        const dotIndex =
            currentIndex % dots.length;

        dots.forEach(function (dot, index) {

            dot.classList.toggle(
                "active",
                index === dotIndex
            );

        });

    }


    /* =====================================================
       MOVE TO SLIDE
    ===================================================== */

    function moveToSlide(index, smooth = true) {

        const step = getCardStep();

        if (!step) return;

        slider.scrollTo({

            left: step * index,

            behavior: smooth
                ? "smooth"
                : "auto"

        });

        currentIndex = index;

        updateDots();

    }


    /* =====================================================
       NEXT SLIDE
    ===================================================== */

    function nextSlide() {

        if (isAnimating) return;

        isAnimating = true;

        currentIndex++;

        const step = getCardStep();

        slider.scrollTo({

            left: step * currentIndex,

            behavior: "smooth"

        });

        updateDots();


        /*
         * After reaching the cloned first card,
         * silently move back to the real first card.
         */

        if (currentIndex >= totalCards) {

            setTimeout(function () {

                slider.style.scrollBehavior = "auto";

                currentIndex = 0;

                slider.scrollLeft = 0;

                updateDots();

                /*
                 * Restore smooth scrolling.
                 */

                requestAnimationFrame(function () {

                    slider.style.scrollBehavior = "smooth";

                });

                isAnimating = false;

            }, SLIDE_DURATION + 50);

        } else {

            setTimeout(function () {

                isAnimating = false;

            }, SLIDE_DURATION);

        }

    }


    /* =====================================================
       PREVIOUS SLIDE
    ===================================================== */

    function previousSlide() {

        if (isAnimating) return;


        /*
         * If we're at the first real card,
         * move to the last original card first.
         */

        if (currentIndex === 0) {

            const step = getCardStep();

            /*
             * Temporarily position at the cloned
             * last card.
             */

            slider.style.scrollBehavior = "auto";

            currentIndex = totalCards;

            slider.scrollLeft = step * currentIndex;


            requestAnimationFrame(function () {

                requestAnimationFrame(function () {

                    slider.style.scrollBehavior = "smooth";

                    currentIndex = totalCards - 1;

                    slider.scrollTo({

                        left: step * currentIndex,

                        behavior: "smooth"

                    });

                    updateDots();

                });

            });

        } else {

            currentIndex--;

            moveToSlide(currentIndex, true);

        }

    }


    /* =====================================================
       NEXT BUTTON
    ===================================================== */

    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            function () {

                nextSlide();

                restartAutoSlide();

            }
        );

    }


    /* =====================================================
       PREVIOUS BUTTON
    ===================================================== */

    if (prevBtn) {

        prevBtn.addEventListener(
            "click",
            function () {

                previousSlide();

                restartAutoSlide();

            }
        );

    }


    /* =====================================================
       DOT BUTTONS
    ===================================================== */

    dots.forEach(function (dot, index) {

        dot.addEventListener(
            "click",
            function () {

                /*
                 * Stop current animation.
                 */

                isAnimating = false;

                /*
                 * Each dot moves approximately
                 * two cards forward.
                 */

                const target =
                    index * 2;

                currentIndex =
                    target % totalCards;

                moveToSlide(
                    currentIndex,
                    true
                );

                restartAutoSlide();

            }
        );

    });


    /* =====================================================
       AUTOMATIC SLIDE
    ===================================================== */

    function startAutoSlide() {

        stopAutoSlide();

        autoSlide = setInterval(
            function () {

                nextSlide();

            },
            AUTO_SLIDE_TIME
        );

    }


    /* =====================================================
       STOP AUTO SLIDE
    ===================================================== */

    function stopAutoSlide() {

        if (autoSlide) {

            clearInterval(autoSlide);

            autoSlide = null;

        }

    }


    /* =====================================================
       RESTART AUTO SLIDE
    ===================================================== */

    function restartAutoSlide() {

        stopAutoSlide();

        startAutoSlide();

    }


    /* =====================================================
       PAUSE WHEN MOUSE IS OVER SLIDER
    ===================================================== */

    slider.addEventListener(
        "mouseenter",
        function () {

            stopAutoSlide();

        }
    );


    slider.addEventListener(
        "mouseleave",
        function () {

            startAutoSlide();

        }
    );


    /* =====================================================
       TOUCH SUPPORT
    ===================================================== */

    slider.addEventListener(
        "touchstart",
        function () {

            stopAutoSlide();

        },
        {
            passive: true
        }
    );


    slider.addEventListener(
        "touchend",
        function () {

            startAutoSlide();

        },
        {
            passive: true
        }
    );


    /* =====================================================
       RESPONSIVE RESIZE
    ===================================================== */

    window.addEventListener(
        "resize",
        function () {

            setTimeout(function () {

                const step = getCardStep();

                slider.style.scrollBehavior = "auto";

                slider.scrollLeft =
                    step * currentIndex;

                slider.style.scrollBehavior = "smooth";

            }, 100);

        }
    );


    /* =====================================================
       INITIAL POSITION
    ===================================================== */

    slider.style.scrollBehavior = "smooth";

    slider.scrollLeft = 0;

    updateDots();

    startAutoSlide();

});


// service section slider ends here


// js for service.html starts here  

document.addEventListener("DOMContentLoaded", function () {

    const revealElements =
        document.querySelectorAll(".services-page .service-feature, .services-page .service-small-card, .services-page .philosophy-box");

    const revealObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("service-visible");

                        revealObserver.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(function (element) {

        element.classList.add("service-hidden");

        revealObserver.observe(element);

    });

});
// js for ServiceWorker.html ends here


/* =========================================================
   ROOT CANAL PAGE JAVASCRIPT
========================================================= */

document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       FAQ ACCORDION
    ====================================================== */

    const faqItems =
        document.querySelectorAll(".rct-faq-item");


    faqItems.forEach(function (item) {

        const question =
            item.querySelector(".rct-faq-question");


        question.addEventListener("click", function () {

            const isActive =
                item.classList.contains("active");


            /* Close all other questions */

            faqItems.forEach(function (otherItem) {

                otherItem.classList.remove("active");

            });


            /* Open clicked question */

            if (!isActive) {

                item.classList.add("active");

            }

        });

    });



    /* =====================================================
       SCROLL REVEAL
    ====================================================== */

    const revealElements =
        document.querySelectorAll(
            ".rct-sign-card, " +
            ".rct-approach-box, " +
            ".rct-timeline-item, " +
            ".rct-benefit, " +
            ".rct-faq-item, " +
            ".rct-final-cta-box"
        );


    revealElements.forEach(function (element) {

        element.classList.add("rct-hidden");

    });


    const revealObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "rct-visible"
                        );

                        revealObserver.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(function (element) {

        revealObserver.observe(element);

    });

});

/* =========================================================
   RESTORATIVE DENTISTRY PAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* ---------------------------------------------------------
       SCROLL REVEAL
    --------------------------------------------------------- */

    const revealElements = document.querySelectorAll(".reveal");

    const revealObserver = new IntersectionObserver(
        function (entries, observer) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("active");

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.12
        }
    );

    revealElements.forEach(function (element) {

        revealObserver.observe(element);

    });


    /* ---------------------------------------------------------
       SMOOTH SCROLL
    --------------------------------------------------------- */

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });


    /* ---------------------------------------------------------
       IMAGE LOADING EFFECT
    --------------------------------------------------------- */

    const images = document.querySelectorAll(
        ".restorative-image img"
    );

    images.forEach(function (image) {

        image.addEventListener("load", function () {

            image.classList.add("loaded");

        });

    });


    /* ---------------------------------------------------------
       FAQ ACCORDION
    --------------------------------------------------------- */

    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(function (item) {

        const question = item.querySelector(".faq-question");

        if (!question) {
            return;
        }

        question.addEventListener("click", function () {

            const isOpen = item.classList.contains("open");

            /* Close other FAQ items */

            faqItems.forEach(function (otherItem) {

                otherItem.classList.remove("open");

            });

            /* Open selected item */

            if (!isOpen) {

                item.classList.add("open");

            }

        });

    });

});

// SCREENING AND DIAGNOSIS PAGE

/* =========================================================
   SCREENING & DIAGNOSIS PAGE JS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       FAQ ACCORDION
    ====================================================== */

    const faqItems = document.querySelectorAll(".sd-faq-item");

    faqItems.forEach(function (item) {

        const button = item.querySelector(".sd-faq-question");

        button.addEventListener("click", function () {

            const isActive = item.classList.contains("active");


            // Close all other FAQ items

            faqItems.forEach(function (otherItem) {

                otherItem.classList.remove("active");

                const otherButton =
                    otherItem.querySelector(".sd-faq-question");

                otherButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            });


            // Open clicked item

            if (!isActive) {

                item.classList.add("active");

                button.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        });

    });



    /* =====================================================
       SCROLL REVEAL
    ====================================================== */

    const revealElements = document.querySelectorAll(
        ".sd-assessment-card, " +
        ".sd-process-item, " +
        ".sd-approach-box, " +
        ".sd-faq-item"
    );


    const revealObserver = new IntersectionObserver(

        function (entries, observer) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("sd-visible");

                    observer.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.12
        }

    );


    revealElements.forEach(function (element, index) {

        element.style.transitionDelay =
            (index * 0.07) + "s";

        revealObserver.observe(element);

    });



    /* =====================================================
       SMOOTH INTERNAL LINKS
    ====================================================== */

    const internalLinks =
        document.querySelectorAll(
            '.sd-page a[href^="#"]'
        );


    internalLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId =
                this.getAttribute("href");

            if (
                targetId &&
                targetId !== "#"
            ) {

                const target =
                    document.querySelector(targetId);

                if (target) {

                    event.preventDefault();

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }

        });

    });


});

// Oral health education page javascipt starts here 
/* =========================================================
   ORAL HEALTH EDUCATION
   PAGE JAVASCRIPT ONLY
========================================================= */


document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       SMOOTH SCROLL
    ===================================================== */

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements = document.querySelectorAll(
        ".oh-feature-card, " +
        ".oh-guidance-image, " +
        ".oh-guidance-content, " +
        ".oh-section-heading, " +
        ".oh-intro-text"
    );


    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            function (entries, observer) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("oh-visible");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


        revealElements.forEach(function (element) {

            observer.observe(element);

        });

    } else {

        revealElements.forEach(function (element) {

            element.classList.add("oh-visible");

        });

    }


    /* =====================================================
       STAGGER FEATURE CARDS
    ===================================================== */

    const cards = document.querySelectorAll(".oh-feature-card");

    cards.forEach(function (card, index) {

        card.style.transitionDelay = (index * 80) + "ms";

    });

});

// oral health education page javascipt ends here


// cosmetric dentistiry javascript file starts here

/* =========================================================
   COSMETIC DENTISTRY PAGE
   FAQ ACCORDION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const faqItems = document.querySelectorAll(".cd-faq-item");

    faqItems.forEach(function (item) {

        const question = item.querySelector(".cd-faq-question");

        question.addEventListener("click", function () {

            /* Close other FAQ items */

            faqItems.forEach(function (otherItem) {

                if (otherItem !== item) {
                    otherItem.classList.remove("active");
                }

            });


            /* Toggle current item */

            item.classList.toggle("active");

        });

    });

});

// cosmetric dentistry javascript file ends here

// teeth extraction page javascript starts here

/* =========================================================
   TEETH EXTRACTION PAGE JAVASCRIPT
========================================================= */


/* =========================================================
   FAQ ACCORDION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const faqItems = document.querySelectorAll(".te-faq-item");

    faqItems.forEach(function (item) {

        const question = item.querySelector(".te-faq-question");

        question.addEventListener("click", function () {

            const isActive = item.classList.contains("active");


            /* Close all other FAQ items */

            faqItems.forEach(function (otherItem) {

                otherItem.classList.remove("active");

            });


            /* Open clicked item */

            if (!isActive) {

                item.classList.add("active");

            }

        });

    });


    /* =====================================================
       SCROLL REVEAL
    ====================================================== */

    const revealElements = document.querySelectorAll(
        ".te-intro-card, " +
        ".te-process-item, " +
        ".te-aftercare-card, " +
        ".te-content-image, " +
        ".te-content-text"
    );


    const revealObserver = new IntersectionObserver(

        function (entries, observer) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("te-visible");

                    observer.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.15
        }

    );


    revealElements.forEach(function (element, index) {

        /* Slight stagger effect */

        element.style.transitionDelay =
            (index % 4) * 0.08 + "s";

        revealObserver.observe(element);

    });


    /* =====================================================
       SMOOTH INTERNAL SCROLL
    ====================================================== */

    document.querySelectorAll(
        '.te-page a[href^="#"]'
    ).forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId =
                this.getAttribute("href");

            if (
                targetId &&
                targetId !== "#"
            ) {

                const target =
                    document.querySelector(targetId);

                if (target) {

                    event.preventDefault();

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }

        });

    });

});

// teeeth extraction page javascript ends here

// preventive dentistry page javascript starts here

/* =========================================================
   PREVENTIVE DENTISTRY PAGE JS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       SMOOTH SCROLL
    ====================================================== */

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });



    /* =====================================================
       SCROLL REVEAL
    ====================================================== */

    const revealElements = document.querySelectorAll(
        ".pd-care-card, .pd-focus-content, .pd-focus-image, .pd-intro-grid, .pd-education-box"
    );

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            function (entries, observer) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("pd-visible");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


        revealElements.forEach(function (element) {

            element.classList.add("pd-reveal");

            observer.observe(element);

        });

    }

});

// preventive dentistry page javascript ends here

// dental implants page javascript starts here


document.addEventListener("DOMContentLoaded", function () {

    const revealItems = document.querySelectorAll(
        ".di-reason-card, " +
        ".di-explained-content, " +
        ".di-explained-image, " +
        ".di-process-card, " +
        ".di-benefit-item, " +
        ".di-candidate-card, " +
        ".di-maintenance-content, " +
        ".di-maintenance-point"
    );

    if (!("IntersectionObserver" in window)) {
        revealItems.forEach(item => {
            item.style.opacity = "1";
            item.style.transform = "none";
        });
        return;
    }

    revealItems.forEach(item => {
        item.style.opacity = "0";
        item.style.transform = "translateY(25px)";
        item.style.transition =
            "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)";
    });

    const observer = new IntersectionObserver(
        (entries, obs) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";
                    entry.target.style.transform = "translateY(0)";

                    obs.unobserve(entry.target);
                }

            });

        },
        {
            threshold: 0.12
        }
    );

    revealItems.forEach(item => {
        observer.observe(item);
    });

});


// dental implants page javascript ends here


// missing teeth page javascript starts here


document.addEventListener("DOMContentLoaded", function () {

    const revealItems = document.querySelectorAll(
        ".rmt-reason-card, " +
        ".rmt-option, " +
        ".rmt-planning-content, " +
        ".rmt-planning-image, " +
        ".rmt-process-card, " +
        ".rmt-benefit-item, " +
        ".rmt-individual-card"
    );

    if (!("IntersectionObserver" in window)) {

        revealItems.forEach(item => {
            item.style.opacity = "1";
            item.style.transform = "none";
        });

        return;
    }

    revealItems.forEach(item => {

        item.style.opacity = "0";

        item.style.transform =
            "translateY(25px)";

        item.style.transition =
            "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)";

    });


    const observer = new IntersectionObserver(
        (entries, obs) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                    obs.unobserve(entry.target);
                }

            });

        },
        {
            threshold: 0.12
        }
    );


    revealItems.forEach(item => {
        observer.observe(item);
    });

});

// missing teeth page javascript ends here

// emergency dentistry page javascript starts here


document.addEventListener("DOMContentLoaded", function () {

    const revealItems = document.querySelectorAll(
        ".edc-reason-card, " +
        ".edc-problem, " +
        ".edc-treatment-content, " +
        ".edc-treatment-image, " +
        ".edc-option-card, " +
        ".edc-process-card, " +
        ".edc-important-content, " +
        ".edc-important-point"
    );


    if (!("IntersectionObserver" in window)) {

        revealItems.forEach(item => {

            item.style.opacity = "1";

            item.style.transform = "none";

        });

        return;
    }


    revealItems.forEach(item => {

        item.style.opacity = "0";

        item.style.transform =
            "translateY(25px)";

        item.style.transition =
            "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)";

    });


    const observer = new IntersectionObserver(

        (entries, obs) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                    obs.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.12
        }

    );


    revealItems.forEach(item => {

        observer.observe(item);

    });

});

// emergency dentistry page javascript ends here





document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       SCROLL REVEAL
    ====================================================== */

    const revealElements = document.querySelectorAll(
        ".diff-section-heading, " +
        ".diff-feature-card, " +
        ".diff-safety-content, " +
        ".diff-rubber-content, " +
        ".diff-guideline-content, " +
        ".diff-prevention-card, " +
        ".diff-female-content, " +
        ".diff-step, " +
        ".diff-statement-inner, " +
        ".diff-final-inner"
    );


    revealElements.forEach(function (element) {

        element.style.opacity = "0";

        element.style.transform = "translateY(30px)";

        element.style.transition =
            "opacity .8s ease, transform .8s ease";

    });


    const observer = new IntersectionObserver(
        function (entries, observer) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.12
        }
    );


    revealElements.forEach(function (element) {

        observer.observe(element);

    });


    /* =====================================================
       STAGGER TECHNOLOGY CARDS
    ====================================================== */

    const featureCards =
        document.querySelectorAll(".diff-feature-card");


    featureCards.forEach(function (card, index) {

        card.style.transitionDelay =
            (index * 0.08) + "s";

    });


    /* =====================================================
       STAGGER PREVENTIVE CARDS
    ====================================================== */

    const preventionCards =
        document.querySelectorAll(".diff-prevention-card");


    preventionCards.forEach(function (card, index) {

        card.style.transitionDelay =
            (index * 0.08) + "s";

    });


    /* =====================================================
       STAGGER EXPERIENCE STEPS
    ====================================================== */

    const steps =
        document.querySelectorAll(".diff-step");


    steps.forEach(function (step, index) {

        step.style.transitionDelay =
            (index * 0.07) + "s";

    });

});



/* =========================================================
   OUR DIFFERENCE - SIMPLE INTERACTIONS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const featureCards =
        document.querySelectorAll(".difference-feature");


    /*
     * Gentle reveal animation when the section
     * enters the screen.
     */

    const observer =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("difference-visible");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.15
            }
        );


    featureCards.forEach(function (card) {

        observer.observe(card);

    });


    /*
     * Make the feature cards feel interactive.
     * Clicking/tapping highlights the selected item.
     */

    featureCards.forEach(function (card) {

        card.addEventListener("click", function () {

            featureCards.forEach(function (item) {

                item.classList.remove("selected");

            });

            card.classList.add("selected");

        });

    });

});

// patient tesstimonial starts here 

document.addEventListener("DOMContentLoaded", function () {

  const section = document.querySelector(".patient-stories");

  if (!section) return;


  /* =====================================================
     ELEMENTS
     ===================================================== */

  const viewport = section.querySelector(
    ".patient-slider-viewport"
  );

  const track = section.querySelector(
    ".patient-slider-track"
  );

  const cards = Array.from(
    section.querySelectorAll(".patient-review-card")
  );

  const prevButton = section.querySelector(
    ".patient-arrow-prev"
  );

  const nextButton = section.querySelector(
    ".patient-arrow-next"
  );

  const dots = Array.from(
    section.querySelectorAll(".patient-dot")
  );


  if (!track || !viewport || cards.length === 0) {
    return;
  }


  /* =====================================================
     STATE
     ===================================================== */

  let currentIndex = 0;

  let cardsPerView = 3;

  let autoSlide = null;

  let touchStartX = 0;
  let touchEndX = 0;


  /* =====================================================
     DETERMINE CARDS PER VIEW
     ===================================================== */

  function getCardsPerView() {

    const width = window.innerWidth;

    if (width <= 700) {
      return 1;
    }

    if (width <= 1100) {
      return 2;
    }

    return 3;
  }


  /* =====================================================
     MAX INDEX
     ===================================================== */

  function getMaxIndex() {

    cardsPerView = getCardsPerView();

    return Math.max(
      0,
      cards.length - cardsPerView
    );
  }


  /* =====================================================
     UPDATE SLIDER
     ===================================================== */

  function updateSlider() {

    const maxIndex = getMaxIndex();

    if (currentIndex > maxIndex) {
      currentIndex = maxIndex;
    }

    /*
      Calculate card width including gap
    */

    const cardWidth =
      cards[0].getBoundingClientRect().width;

    const trackStyle =
      window.getComputedStyle(track);

    const gap =
      parseFloat(trackStyle.gap) || 0;

    const moveAmount =
      currentIndex * (cardWidth + gap);

    track.style.transform =
      `translateX(-${moveAmount}px)`;


    /* =================================================
       BUTTON STATE
       ================================================= */

    if (prevButton) {
      prevButton.disabled =
        currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled =
        currentIndex >= maxIndex;
    }


    /* =================================================
       DOT STATE
       ================================================= */

    dots.forEach(function (dot, index) {

      dot.classList.toggle(
        "active",
        index === currentIndex
      );

    });
  }


  /* =====================================================
     NEXT
     ===================================================== */

  function goNext() {

    const maxIndex = getMaxIndex();

    if (currentIndex < maxIndex) {

      currentIndex++;

    } else {

      /*
        Return to beginning
        for continuous autoplay
      */

      currentIndex = 0;
    }

    updateSlider();
  }


  /* =====================================================
     PREVIOUS
     ================================================= */

  function goPrevious() {

    const maxIndex = getMaxIndex();

    if (currentIndex > 0) {

      currentIndex--;

    } else {

      currentIndex = maxIndex;
    }

    updateSlider();
  }


  /* =====================================================
     BUTTON EVENTS
     ===================================================== */

  if (nextButton) {

    nextButton.addEventListener(
      "click",
      function () {

        goNext();
        restartAutoSlide();

      }
    );
  }


  if (prevButton) {

    prevButton.addEventListener(
      "click",
      function () {

        goPrevious();
        restartAutoSlide();

      }
    );
  }


  /* =====================================================
     DOT EVENTS
     ===================================================== */

  dots.forEach(function (dot, index) {

    dot.addEventListener(
      "click",
      function () {

        const maxIndex = getMaxIndex();

        currentIndex =
          Math.min(index, maxIndex);

        updateSlider();

        restartAutoSlide();

      }
    );

  });


  /* =====================================================
     AUTO SLIDE
     ===================================================== */

  function startAutoSlide() {

    stopAutoSlide();

    /*
      Don't autoplay if all cards
      are already visible.
    */

    if (getMaxIndex() <= 0) {
      return;
    }

    autoSlide = setInterval(
      function () {

        goNext();

      },
      5000
    );
  }


  function stopAutoSlide() {

    if (autoSlide) {

      clearInterval(autoSlide);

      autoSlide = null;
    }
  }


  function restartAutoSlide() {

    startAutoSlide();
  }


  /* =====================================================
     PAUSE ON HOVER
     ===================================================== */

  viewport.addEventListener(
    "mouseenter",
    stopAutoSlide
  );

  viewport.addEventListener(
    "mouseleave",
    startAutoSlide
  );


  /* =====================================================
     TOUCH SWIPE
     ===================================================== */

  viewport.addEventListener(
    "touchstart",
    function (event) {

      touchStartX =
        event.changedTouches[0].screenX;

      stopAutoSlide();

    },
    { passive: true }
  );


  viewport.addEventListener(
    "touchend",
    function (event) {

      touchEndX =
        event.changedTouches[0].screenX;

      const difference =
        touchStartX - touchEndX;


      /*
        Swipe left
      */

      if (difference > 50) {

        goNext();

      }


      /*
        Swipe right
      */

      if (difference < -50) {

        goPrevious();

      }

      startAutoSlide();

    },
    { passive: true }
  );


  /* =====================================================
     KEYBOARD ACCESSIBILITY
     ===================================================== */

  document.addEventListener(
    "keydown",
    function (event) {

      /*
        Only react when testimonial
        section is reasonably visible
      */

      const rect =
        section.getBoundingClientRect();

      const visible =
        rect.top < window.innerHeight &&
        rect.bottom > 0;

      if (!visible) return;


      if (event.key === "ArrowRight") {

        goNext();

      }


      if (event.key === "ArrowLeft") {

        goPrevious();

      }

    }
  );


  /* =====================================================
     RESIZE
     ===================================================== */

  let resizeTimer;

  window.addEventListener(
    "resize",
    function () {

      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(
        function () {

          updateSlider();

        },
        150
      );

    }
  );


  /* =====================================================
     SECTION ENTRANCE ANIMATION
     ===================================================== */

  if ("IntersectionObserver" in window) {

    const observer =
      new IntersectionObserver(
        function (entries) {

          entries.forEach(
            function (entry) {

              if (entry.isIntersecting) {

                section.classList.add(
                  "is-visible"
                );

                observer.unobserve(
                  section
                );

              }

            }
          );

        },
        {
          threshold: 0.15
        }
      );

    observer.observe(section);

  } else {

    section.classList.add(
      "is-visible"
    );

  }


  /* =====================================================
     INITIALISE
     ===================================================== */

  updateSlider();

  startAutoSlide();

});
// patient tesstimonial ends here