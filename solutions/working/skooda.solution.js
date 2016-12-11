{
    name: 'SKooDA\'s Solution for ** manualy controlled ** game',
    url: 'https://github.com/magwo/elevatorsaga/wiki/SKooDA\'s-very-ugly-%22manual-control%22-solution',
    init: function(elevators, floors) {
        var create = function(htmlStr) {
            var frag = document.createDocumentFragment(),
                temp = document.createElement('div');
                temp.innerHTML = htmlStr;
            while (temp.firstChild) {
                frag.appendChild(temp.firstChild);
            }
            return frag;
        }

        var worlds = document.getElementsByClassName('innerworld');
        var world = worlds[0];

        for (f = (floors.length - 1); f >= 0; f--) {
            for (e = 0; e < elevators.length; e++) {
                fragment = create('<div id="shaft-'+f+'-'+e+'" style="background: rgba(222,222,222,' + (f/50) +'); position: absolute; z-index: 999; width: 44px; bottom: '+ f*50 +'px; height: 50px; left: ' + (200 + e*60)+ 'px" onClick="world.elevators['+e+'].goToFloor('+f+'); this.style.border=\'none\';"></div>') 
                world.insertBefore(fragment, world.childNodes[0]);
            }
        };

        for (i = 0; i < elevators.length; i++) {
            var hilight = function (elevatorNum) {
                return function(floorNum) {
                  document.getElementById("shaft-"+floorNum+"-"+elevatorNum).style.border = "1px solid red";
                }
            };            

            elevators[i].on("floor_button_pressed", hilight(i));
        };
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}