define(function(require, exports, module) {
    var Surface            = require('famous/core/Surface');
    var RenderNode         = require('famous/core/RenderNode');
    var Modifier           = require('famous/core/Modifier');
    var StateModifier      = require('famous/modifiers/StateModifier');
    var Transform          = require('famous/core/Transform');
    var View               = require('famous/core/View');
    var ScrollView         = require('famous/views/Scrollview');
    
    var NavigationBar = require('famous/widgets/NavigationBar');

    function StandardHeader(options) {
        View.apply(this, arguments);
        
        this.OpacityModifier = new StateModifier({
            opacity: 1
        });

        // create the header's bg
        this.background = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "white",
                zIndex: "-10"
            }
        });

        this.navBar = new NavigationBar(options); 
        this.navBar.pipe(this._eventOutput);

        // add to tree
        this.HeaderNode = new RenderNode();
        this.HeaderNode.add(this.background);
        this.HeaderNode.add(this.OpacityModifier).add(this.navBar);

        this.add(this.HeaderNode);

    }

    StandardHeader.prototype = Object.create(View.prototype);
    StandardHeader.prototype.constructor = StandardHeader;


    StandardHeader.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:

                        that.OpacityModifier.setOpacity(1);

                        // Hide/move elements
                        window.setTimeout(function(){
                            // Fade header
                            that.OpacityModifier.setOpacity(0, transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                switch(otherViewName){

                    default:

                        // Default header opacity
                        
                        that.OpacityModifier.setOpacity(0);

                        // Header
                        // - no extra delay
                        window.setTimeout(function(){

                            // Change header opacity
                            that.OpacityModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);


                        break;
                }
                break;
            default:
                console.error('NOT SHOWING OR HIDING');
                console.log(arguments);
                console.log(direction);
                debugger;
        }

        return transitionOptions;
    };


    StandardHeader.DEFAULT_OPTIONS = {
    };

    module.exports = StandardHeader;
});
