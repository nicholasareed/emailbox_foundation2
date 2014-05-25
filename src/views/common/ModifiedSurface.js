define(function(require, exports, module) {
    var Surface            = require('famous/core/Surface');
    var Modifier           = require('famous/core/Modifier');
    var StateModifier           = require('famous/modifiers/StateModifier');
    var Transform          = require('famous/core/Transform');
    var View               = require('famous/core/View');

    var Timer = require('famous/utilities/Timer');

    var Utils = require('utils');

    var $ = require('jquery');
    
    function ModifiedSurface(options) {
        Surface.apply(this, arguments);
        if (options) this.setOptions(options);

        if(options.initialSize){
            options.size[0] = options.initialSize[0];
            options.size[1] = options.initialSize[1];
        }

        this.RealSizeMod = new StateModifier({
            size: [options.size[0], options.size[1]]
        });
        this.on('sizeUpdated', function(){
            // console.log(this.getSize());
            // console.log(this.);
            if(this._size != null && this._size[1] != 0){
                // console.log(this._size);
                // console.dir(this._size.origin._size);
                this.RealSizeMod.setSize(this.getSize());
            }
        }.bind(this));

    }

    ModifiedSurface.prototype = Object.create(Surface.prototype);
    ModifiedSurface.prototype.constructor = ModifiedSurface;

    ModifiedSurface.DEFAULT_OPTIONS = {};

    ModifiedSurface.prototype.getSize = function () {
        // console.log(this._size);
        return this._size;
    };

    ModifiedSurface.prototype.deploy = function deploy(target) {
        var content = this.getContent();
        if (content instanceof Node) {
            while (target.hasChildNodes()) target.removeChild(target.firstChild);
            target.appendChild(content);
        }
        else target.innerHTML = content;

    };

    module.exports = ModifiedSurface;
});
