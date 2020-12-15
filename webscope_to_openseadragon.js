/*
To apply this script to a page running Aperio WebScope, paste the line below into the browser's debugger console
var s = document.createElement('script');s.src="https://pearcetm.github.io/webscope-to-openseadragon/webscope_to_openseadragon.js";document.head.append(s);

*/
var openseadragonImagePath = 'https://pearcetm.github.io/webscope-to-openseadragon/images/';

if (!console || !console.log) console = { log: function () { } };
window.setTimeout(load_dependencies, 0);

// End of imperative section section
// Below are functions called as resources are loaded

function load_dependencies(){
    var ready = true;
    var jq_added = false;
    var osd_added = false;

	if(typeof(jQuery) === 'undefined'){
        ready = false;
        if(!jq_added){
            var jq = document.createElement('script');
            jq.src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js";
            document.head.append(jq);
            jq_added=true;
        }
        
    }
    if(typeof(OpenSeadragon) === 'undefined'){
		ready = false;
        if(osd_added==false){
            var s = document.createElement('script');
            s.src="https://cdnjs.cloudflare.com/ajax/libs/openseadragon/2.4.2/openseadragon.min.js";
            document.head.append(s);
            osd_added=true;
        }
	}
    if(!ready){
        window.setTimeout(load_dependencies,1000);
        return;
    }
    else{
        setupPage()
    }
	
}

function setupPage(){
    var openSeadragonContainerID = 'osd'
	$('body').empty().attr('onresize','');
	$('<div>',{id:openSeadragonContainerID}).css({position:'fixed',left:0,top:0,width:'100%',height:'100%'}).appendTo('body');
	var base_url = window.location.href;
    var components = base_url.match(/(.+\/)(.+.svs)/);

    var opts = {
        id:openSeadragonContainerID
    }

    window.viewer = createViewer(opts);

    //fetch image data from stats.xml of parent directory and open the image 
    $.ajax({
        type: 'GET',
        url: components[1]+'stats.xml',
        dataType:'xml',
        success: function(data){on_image_stats(data,base_url,components[2])},
        error:function(){alert('There was a problem fetching image information from the server. Please try again later.')}
    });

    
}


function createViewer(opts){
    if(!opts) opts={};
    //allow passing in element by id or by element, as OpenSeadragon does.
    //however, there is/was a bug in OpenSeadragon where it overrides element style if pass in as "element"
    //so, give it a unique id and pass it in that way.
    var element = null;
    if(opts.id) element = $('#'+opts.id);
    if(opts.element) element = $(opts.element);
    if(!opts.id && !opts.element) error('No target was defined. Use the "id" or "element" option to specify the target.');
    
    //create a unique ID, if needed; use this to uniquely target the element by ID
    var elementID = element.attr('id');
    if(!elementID){
        var base = 'openseadragon-container';
        elementID = base;
        var i = 0;
        while($('#'+elementID).length > 0){
            i++;
            elementID = base + i;
        }
    }
    //delete the 'element' field to use the id instead
    delete opts.element;
    element.attr('id',opts.id);
    opts.id = elementID;

    //start with defaults and override as necessary with user opts
    var defaultOpts = {
        prefixUrl: openseadragonImagePath,
        springStiffness: 40,
        zoomPerScroll: 1.2,
        showNavigator: true,
    };
    opts = $.extend({}, defaultOpts, opts);

    //create the viewer
    var viewer = new OpenSeadragon.Viewer(opts);
    return viewer;
}

function on_image_stats(data,url,filename){
    //find this image in the xml data structure and extract parameters using parse_aperio_source()
    var imgdata=$(data.documentElement).find('image').filter((i,e)=>$(e).find('filename').text()==filename);
    if(imgdata.length !=1){
        alert('There was a problem fetching image information from the server. Please see debugger for details.');
        console.log('Returned XML',data.documentElement);
        console.log('Filtered image element(s)',imgdata);
    }
    else{
        var source = parse_aperio_source(url, imgdata[0]);
        window.viewer.open(source);
    }

}

function parse_aperio_source(url,data) {
    var data = $(data);
    
    var d = url.match(/(.+\/)(.+.svs)/);
    var baseUrl = decodeURIComponent(d[1]);
    var filename = decodeURIComponent(d[2]);
    var imageWidth = parseInt(data.find('width').text());
    var imageHeight = parseInt(data.find('height').text());
    var imageTile = parseInt(data.find('tilewidth').text());
    var appmag = parseInt(data.find('appmag').text());

    var levels = [0.5, 1, 2, 4, 10, 20, 40, 60];
    var imageLevels = $.map(levels, function (val, i) { if (val <= appmag) return 1; }).length;

    var source = {
        width: imageWidth,
        height: imageHeight,
        tileSize: imageTile,
        maxLevel: imageLevels,
        scanPower: levels[imageLevels-1],
        imageURL: baseUrl + filename,
        getTileUrl: getTileUrlAperio,
    };
    
    return source;
     
}

function getTileUrlAperio(level, x, y) {
    var p = Math.pow(2, this.maxLevel - level);
    var url = this.imageURL;
    x = x * this._tileWidth * p;
    y = y * this._tileHeight * p;
    url = url + "?0" + x + "+" + "0" + y + "+" + this._tileWidth + "+" + this._tileHeight + "+" + p;
    return url;
};

