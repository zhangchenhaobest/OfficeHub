(function(){
    window.addEventListener('scroll', function () {
        const header = document.querySelector('#js_header');
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
        if (scrollPosition > 60) {
          header.style.backgroundColor = 'rgba(0,0,0,0.6)';
        } else {
          header.style.backgroundColor = '';
        }
      });
})()