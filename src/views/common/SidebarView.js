define(function(require, exports, module) {
    var Entity = require('famous/core/Entity');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var OptionsManager = require('famous/core/OptionsManager');

    var Surface            = require('famous/core/Surface');
    var Modifier           = require('famous/core/Modifier');
    var StateModifier      = require('famous/modifiers/StateModifier');
    var View               = require('famous/core/View');
    var ScrollView         = require('famous/views/Scrollview');
    
    var NavigationBar = require('famous/widgets/NavigationBar');

    function SidebarView(params) {

        var that = this;
        View.apply(this, arguments);
        this.params = params || {};

        this.options = Object.create(SidebarView.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._entityId = Entity.register(this);

        this.header = new RenderNode();
        this.footer = new RenderNode();
        this.content = new RenderNode();


        
        this.OpacityModifier = new StateModifier({
            opacity: 1
        });

        // Title
        this.title = new View();
        this.title.Surface = new Surface({
            content: "Dashboard",
            size: [true, 40],
            properties: {
                lineHeight: "40px",
                color: "#444"
            }
        });
        this.title.add(this.title.Surface);
        this.header.Sequence.push(this.title);

        // attach to sequence
        this.header.sequenceFrom(this.header.Sequence);

        this.navBar = new NavigationBar(options); 
        this.navBar.pipe(this._eventOutput);

        // add to tree
        this.HeaderNode = new RenderNode();
        this.HeaderNode.add(this.background);
        this.HeaderNode.add(this.OpacityModifier).add(this.navBar);

        this.add(this.HeaderNode);

    }

    SidebarView.prototype = Object.create(View.prototype);
    SidebarView.prototype.constructor = SidebarView;


    SidebarView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
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


    SidebarView.DEFAULT_OPTIONS = {

    };

    module.exports = SidebarView;
});
