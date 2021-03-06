var toptimestamp;
var bottomtimestamp;

var refresherTimer;
var infinitescrollTimer;
var infiniteScrollWait = 5000;
var fillingButton;
var buttonFilledHeight;
var updateIntervalInSec = 120;

var browserType;
var id = 0;
var box_images = [];    //saves the array of images for each box
var best_match_tb = []; //saves the array of best match thumbnail
var imageSeachers = [];
var imageSeachersPage = [];
var verbose = 0;
google.load("search", "1");

function assign_image_to_box(boxnum) {
    return function (searcher) {
        if (searcher.results && searcher.results.length > 0) {
            box_images[boxnum] = searcher.results;
            if (searcher.results && searcher.results.length > 0 && !best_match_tb[boxnum]) {
                best_match_tb[boxnum] = box_images[boxnum][0].tbUrl;    //save the best thumbnail
            }
            if (verbose) {
                console.log('received results for box' + boxnum);
                console.log(box_images);
            }
            useNextBestImg(boxnum);
        }
    };
}

//checks for 404 on image links
function imgCheck(boxnum, url) {
    if (verbose) { console.log("box" + boxnum + " is checking img " + url); }
    var img = new Image();
    img.onload = function () { imgExist(boxnum, url); };
    img.onerror = function () { useNextBestImg(boxnum); };
    img.src = url;
}

//Called when the image exists, assign to box as a background
function imgExist(boxnum, url) {
    if (verbose) { console.log('box' + boxnum + " is set to use img" + url); }
    $("#box" + boxnum).css('background-image', 'url(' + url + ')');
}

//Called when image is not available , eg 404, use next img instead.
function useNextBestImg(boxnum) {
    if (verbose) { console.log('box' + boxnum + "is looking for a image in page " + imageSeachersPage[boxnum]); }
    if (box_images[boxnum] && box_images[boxnum].length > 0) {
        // guarenteed: length > 0
        while (
            box_images[boxnum].length > 0 &&   //there's more
                (box_images[boxnum][0].height < 300 || box_images[boxnum][0].width < 300)    //and img too small
        ) {
            if (verbose) { console.log(boxnum + " dumped an img"); }
            box_images[boxnum].shift();    //throw the head away
        }
        //Post: we ran out / we have sufficiently large img
        if (box_images[boxnum].length > 0) {
            //we have sufficiently large img
            imgCheck(boxnum, box_images[boxnum][0].url);
            box_images[boxnum].shift();
            return;
        }
    }
    // Guarenteed: we ran out of images, get next page if available
    //we ran out
    if (imageSeachersPage[boxnum] > 8) {
        // Damn, nothing useful after 8 pages / 64 images. Just load the thumb, better load shitty image instead of showing irrelevant image
        if (verbose) { console.log("box" + boxnum + " has no suitable img, using thumb " + best_match_tb[boxnum]); }
        $("#box" + boxnum).css('background-image', 'url(' + best_match_tb[boxnum] + ')');
    } else {
        imageSeachersPage[boxnum]++;
        if (verbose) { console.log("box" + boxnum + " is looking at page " + imageSeachersPage[boxnum]); }
        imageSeachers[boxnum].gotoPage(imageSeachersPage[boxnum]);
        // box_images[boxnum] = imageSeachers[boxnum].results;
        // if (verbose) { console.log(imageSeachers[boxnum].results); }
        // if (verbose) { console.log(box_images[boxnum]); }
    }
}

function insert_box_skeleton(id, _pend) {
    /*     
    input: box-id
    Workflow:
        prepare html
        append/prepend html to the div
        apply javascript to enable the fancy animation & state fixing
    */
    $box = $(""
        + "<div id = 'box" + id + "' class = 'box col'>"    // onClick = 'boxClick(" + id + ");'
        +    "<div id = 'description" + id + "' class = 'titlecard'>"
        +    "</div>"        
        +    "<div class = 'mask mask-1'></div>        <div class = 'mask mask-2'></div>"
        +    "<div class = 'details' style = ''>"
        +        "<div class = 'left' style = 'width:199px; height:403px; float:left'>"
        +             "<div class = 'boxw' style = 'margin-bottom: 10px;height:203px'>"
        +                "<div id = 'article" + id + "' class = 'scrollable' style = ''>"
        +                "</div>"
        +             "</div>"        
        +             "<div id = 'wordcloud" + id + "' class = 'boxw' style = 'height:165px'></div>"
        +        "</div>"        
        +        "<div class = 'right' style = 'width:199px; height:403px; float:left;'>"
        +             "<div id = 'tweets" + id + "' class = 'boxw scrollable' style = 'height:368px'>"
        +                "<span id = 'addtweet" + id + "'/>"
        +             "</div>"
        +             "<div id = 'sentiment" + id + "' class = 'boxw' style = 'width: 189px; height: 15px'>"
        +                 "<div class = 'round'>"
        +                   "<div id = 'sneg" + id + "' class = 'sentimentR' style = 'width: 50%;'></div>"
        +                   "<div id = 'spos" + id + "' class = 'sentimentG' style = 'width: 50%;'></div>"
        +                 "</div>"
        +             "</div>"
        +         "</div>"    
        +     "</div>"        
        + "</div>");
    if (verbose) { console.log("box" + id + " should now be " + _pend + "ed"); }
    if (_pend === 'prepend') {
        $("#container").children().first().after($box);
    } else {
        $('#container').append($box).masonry('appended', $box, true);
        // $("#container").append($box);
    }

    var canvasDivWidth = $("#wordcloud" + id).width();
    var canvasDivHeight = $("#wordcloud" + id).height();
    $("#wordcloud" + id).append("<canvas id = 'wordcloudcanvas" + id + "' width = '" + canvasDivWidth + "' height = '" + canvasDivHeight + "'>");
    $('#box' + id).toggle(function () {
        //First time clicked
        if (verbose) { console.log("fixing box" + id); }
        var target = $('#box' + id);
        target.addClass('box-hover');
        $('#box' + id).css('border', 'solid red 1px');
    }, function () {
         //Revert
        if (verbose) { console.log("unfixing box" + id); }
        var target = $('#box' + id);
        target.removeClass('box-hover');
        $('#box' + id).css('border', '');
    });
}

// populateBox puts content into the html skeleton
// ie title, summary, tweets, background pic
function populateBox(boxnum, timeout, _pend) {
    return function (data) {
        setTimeout(function () {

            if (!document.getElementById("box" + boxnum)) {
                insert_box_skeleton(boxnum, _pend);
				$('#container').masonry('reload');
                setTimeout(function () { $('#container').masonry('reload'); }, 0);
            }

            //sentiment bar
            var neg, pos;
            if (data.sentiment.negative + data.sentiment.positive > 0) {
                neg = Math.floor(100 * data.sentiment.negative / (data.sentiment.negative + data.sentiment.positive));
                pos = 100 - neg;
            } else {
                neg = 50;
                pos = 50;
            }
            $("#sneg" + boxnum).css('width', neg + '%');
            $("#spos" + boxnum).css('width', pos + '%');
            //end sentiment bar

            var i, kwds = "";
            for (i = 0; i < data.keywords.length; i++) {
                kwds +=  data.keywords[i];
                if (i < data.keywords.length - 1) { kwds +=  ", "; }
            }

            $("#description"+boxnum).html("<div style = 'height: 3px;"
                                              + "background:  #a6a6a6;"
                                              + "background: -webkit-gradient(linear, left top, right top, color-stop(" + (neg / 100) + ", #FF1A01), color-stop(" + (neg / 100) + ", #02f058));"
                                              + "background: -moz-linear-gradient(left, #FF1A01 " + neg + "%, #02f058 " + neg + "%);'></div>"
                                              + "<div style = 'margin-bottom: 5px;'><h1>"
                                              + data.title + "</h1></div>");
            $("#article"+boxnum).html("<h2><a onclick = 'javascript:window.location.href = " + '"' + data.link + '"'  + ";'>" + data.title + "</a></h2><p>" + data.summary + "</p>");

            //wordcloud
            var i, cloud = [];
            for (i in data.wordcloud) {
                cloud.push([i, data.wordcloud[i] * 12]);
            }
            if (cloud.length  ===  0) {
                cloud.push(['none', 30]);
            }
            $("#wordcloudcanvas" + boxnum).wordCloud({ wordList: cloud });
            //end wordcloud

            if (verbose) {
                //list of keywords for maciek
                var tbox = "<p style = 'width:inherit;'><strong>Keywords: </strong>" + kwds + "</p>";
                $("#addtweet" + boxnum).append(tbox);
            }

            //tweets
            for (i = 0; i < data.tweets.length; i++) {
                var tbox = "<p style = 'width:inherit;'><strong>" + data.tweets[i].user + ": </strong>" + data.tweets[i].text + "</p>";
                $("#addtweet" + boxnum).append(tbox);
            }
            $('.scrollable').jScrollPane({});
            //end tweets

            var imageSearch = new google.search.ImageSearch();
            imageSeachers[boxnum] = imageSearch;
            imageSeachersPage[boxnum] = 0;
            imageSearch.setNoHtmlGeneration();
            imageSearch.setResultSetSize(8);
            imageSearch.setRestriction(
                google.search.Search.RESTRICT_SAFESEARCH,
                google.search.Search.SAFESEARCH_OFF
            );    //Will we ever get porn? ;)
        
            // var searcher = new google.search.ImageSearch();
            // searcher.setRestriction(google.search.ImageSearch.RESTRICT_RIGHTS,
            //                         google.search.ImageSearch.RIGHTS_MODIFICATION
            // );    // Remove comments to be Ethicial 
        
            imageSearch.setSearchCompleteCallback(this, assign_image_to_box(boxnum), [imageSearch]);
            imageSearch.execute('' + data.title + '');

            /*
            // Get tweets using Twitter REST API            
            if (data.keywords.length > 0)
                $.ajax({type: "GET", url: "http://search.twitter.com/search.json?q = "+data.keywords[0]+"&rpp = 10&result_type = mixed", dataType: "jsonp", success: parseTweets(boxnum)});
            */
        }, timeout);
    };
}

function initiateInfiniteScroll() {
    infinitescrollTimer = setInterval('infinite_scroll();', 250);
}

function infinite_scroll() {
    var scrolled = $(document).scrollTop();
    var windowHeight = $(window).height(); 
    var docHeight = $(document).height();
    var distFromBottom = docHeight - windowHeight - scrolled;
    if (distFromBottom < 150) {
        clearInterval(infinitescrollTimer);    //Prevent it from being fired again
        $.getJSON("api/news/before/" + bottomtimestamp, function (data) {
            if (data.bottomtimestamp) {
                bottomtimestamp = data.bottomtimestamp;
            }
            if (verbose) {
                console.log(data);
                console.log(data.bottomtimestamp);
                console.log('infinite scroll: toptimestamp = ' + toptimestamp + ', bottomtimestamp = ' + bottomtimestamp);
            }
            for (i = 0; i < data.news.length; i++) {
                $.getJSON("api/story/"+data.news[i], populateBox(data.news[i], i*600, 'append'));
                if (verbose)    console.log('current id = ' + data.news[i]);
            }
        });
        setTimeout(initiateInfiniteScroll, infiniteScrollWait);
    }
}

function update() {
    if (verbose) { console.log(toptimestamp); }
    $.getJSON("api/news/after/" + toptimestamp, function (data) {
        if (verbose) { console.log(data); }
        if (data.toptimestamp) {
            toptimestamp = data.toptimestamp;
        }
        if (verbose) { console.log('update: toptimestamp = ' + toptimestamp + ', bottomtimestamp = ' + bottomtimestamp); }
        for (i = 0; i < data.news.length; i++) {
            $.getJSON("api/story/"+data.news[i], populateBox(data.news[i], i*600, 'prepend'));
            if (verbose) { console.log('current id = ' + data.news[i]); }
        }
    });
}

//For the manual refresh
function timer() {
    update();
    buttonFilledHeight = 0;
    refresherTimer = setTimeout(timer, updateIntervalInSec*1000);
}

//Fills the update button
function updateButton() {
    var top = buttonFilledHeight ;
    var bottom = buttonFilledHeight - 15;
    switch(browserType) {
        case 'webkit': 
            $('#refresh').css('background','-webkit-linear-gradient(right , rgb(222,222,55) '+bottom+'%, rgb(255,255,255) '+ top +'%)');
            break;
        case 'mozilla':
            $('#refresh').css('background','-moz-linear-gradient(right , rgb(222,222,55) '+bottom+'%, rgb(255,255,255) '+ top +'%)');
            break;
        case 'opera':
            $('#refresh').css('background','-o-linear-gradient(right , rgb(222,222,55) '+bottom+'%, rgb(255,255,255) '+ top +'%)');
            break;
        case 'ie':
            $('#refresh').css('background','-ms-linear-gradient(right , rgb(222,222,55) '+bottom+'%, rgb(255,255,255) '+ top +'%)');
            break;
        default:
            $('#refresh').css('background', 'linear-gradient(right , rgb(222,222,55) '+bottom+'%, rgb(255,255,255) '+ top +'%)');
    }
    // if (verbose) { console.log('buttonFilledHeight = ' + bottom + ', top = ' + top); }
    buttonFilledHeight +=  100/(updateIntervalInSec*30);
    // buttonFilledHeight +=  100/(updateIntervalInSec*2);
}

$(document).ready(function () {
    // when ready, fetch news, use append
    $('#container').masonry({
        // options
        itemSelector : '.box',
        isAnimated: true,
        isFitWidth: true
    });

    $.getJSON("api/news", function (data) {
        toptimestamp = data.toptimestamp;
        bottomtimestamp = data.bottomtimestamp;
        if (verbose) { console.log('toptimestamp = ' + toptimestamp + ', bottomtimestamp = ' + bottomtimestamp); }
        for (i = 0; i < data.news.length; i++) {
            $.getJSON("api/story/"+data.news[i], populateBox(data.news[i], i*600, 'append'));
            if (verbose) { console.log('current id = ' + data.news[i]); }
        }
    });
    
    // Infinite scroll
    /* 
    //Note: To prevent infinite scroll from firing at the beginning, we do a set time out for 10 seconds
    setTimeout(function () {
        setInterval('infinite_scroll();', 250);
    }, 10*1000);
     */
    // Use timestamp now, fetch at most once every 5 seconds
    setTimeout(initiateInfiniteScroll, infiniteScrollWait);
    
    // End infinite scroll
    
    if ($.browser.webkit) {
        browserType = 'webkit';
    }else if ($.browser.mozilla) {
        browserType = 'mozilla';
    }else if ($.browser.opera) {
        browserType = 'opera';
    }else if ($.browser.msie) {
        browserType = 'ie';
    }
    buttonFilledHeight = 0;
    $('#refresh').click(function () {
        clearTimeout(refresherTimer);
        timer();
    });
    
    refresherTimer = setTimeout(timer, updateIntervalInSec * 1000);
    fillingButton = setInterval(updateButton, 30);
    
    $("#boxhelp").css('background-image', 'url("static/images/tanr-logo.png")');

    $('#boxhelp').toggle(function () {
        //First time clicked
        if (verbose) { console.log("fixing box"+id); }
        var target = $('#boxhelp');
        target.addClass('box-hover');
        $('#boxhelp').css('border', 'solid red 1px');
    }, function () {
         //Revert
        if (verbose) { console.log("unfixing box"+id); }
        var target = $('#boxhelp');
        target.removeClass('box-hover');
        $('#boxhelp').css('border', '');
    });
    
    var canvasDivWidth = $("#wordcloudhelp").width();
    var canvasDivHeight = $("#wordcloudhelp").height();
    $("#wordcloudhelp").append("<canvas id = 'wordcloudcanvashelp' width = '" + canvasDivWidth + "' height = '" + canvasDivHeight + "'>");
    //wordcloud
    var words = ["On", "Wordcloud", "Tweets"];
    console.log(words);
    var i, cloud = [];
    for (i in words) {
        cloud.push([words[i], (parseInt(i)+1.0)*2.3+20]);
        console.log([i, words[i], (parseInt(i)+1.0)+20]);
    }
    $("#wordcloudcanvashelp").wordCloud({wordList: cloud});
    //end wordcloud
});

