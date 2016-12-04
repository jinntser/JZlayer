/*************************************
 ***  Created by JZ on 2016/10/04  ***
 ***  JZlayer ver.0.8.10.14        ***
 ************************************/
/*

 #### 狀態 ####
 container: 套用播放器的元件 (string: jquery selector)
 currentPlayer: 當下使用的播放器 (string)  (可能用不到)
 totalVideos: 影片總數 (num) (總數減一，功能上省去額外計算)
 currentPlay: 現正播放 (num)
 currentTime: 當下影片播放進度 (num)
 autoPlay: 是否自動播放 (boolean)  (判斷播放完畢是否停止播放用)
 loop: 重複播放 (num)  --> { 0:none, 1:all, 2:single }
 shuffle: 隨機播放 (boolean)
 isSeeking: 是否正在拖動時間軸 (boolean)
 duration: 影片長度 (num)  (秒)
 videoType: 影片來源 (string)  --> { 'mp4', 'youtube', 'tvp' }
 height: 播放器高度
 width: 播放器寬度
 playerState: 播放器狀態 (暫定，可能用不到)
 tvpTagID: 騰訊影片播放器產生的tag id (string)  --> 'tenvideo_video_player_'
 tvpCount: 騰訊影片的播放次數 (num)  (為了釋放記憶體，初始值為-1，第一次初始化tvpPlayer會變成0)
 ytInited: youtube播放器是否已初始化 (boolean)
 tvpInited: 騰訊播放器是否已初始化 (boolean)
 playList: 播放清單 (json)  --> [ { title: 標題, artist: 作者(好像用不到), type: 來源, id: 影片id }, {}, {}, ... ]
 debug: debug mode (boolean)


 #### 功能 ####
 init: 初始化，插入所有需要的html tag
 setCurrentVideo: 設定現在要播放的影片
 stopAll: 停止所有影片
 nextVideo: 下一支影片
 prevVideo: 前一支影片
 shuffle: 隨機播放 (亂數產生0-totalVideo之間的數字)
 togglePlay: 切換播放/暫停
 toggleShuffle: 切換隨機播放
 toggleLoop: 切換重複播放
 getCurrentTime: 抓播放時間
 setCurrentTime: 設定播放時間
 seekTime: 時間軸功能
 focusCurrent: 列表滾動至現正播放的項目

 */
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function newPlayer(target, playlist) {
    var status = {
            container: $(target),
            currentPlayer: null,
            totalVideos: 0,
            currentPlay: 0,
            currentTime: 0,
            autoPlay: true,
            loop: 0,
            shuffle: false,
            isSeeking: false,
            duration: 0,
            videoType: '',
            height: 360,
            width: 720,
            playerState: false,
            tvpTagID: 'tenvideo_video_player_',
            tvpCount: -1,
            ytInited: false,
            tvpInited: false,
            playList: playlist,
            debug: true
        },
        fns = {
            init: function () {
                function renderFrame() {
                    var htmlCode = '<div id="playerWrap">' +
                        '<div id="YTbox" class="player"></div><div id="TVPbox" class="player"></div>' +
                        '</div><nav style="position: relative;"><ul class="controls"><li id="prev"><i class="fa fa-step-backward"></i></li><li id="play" class="paused"><i class="fa fa-play"></i><i class="fa fa-pause"></i></li><li id="next"><i class="fa fa-step-forward"></i></li><li id="time"><span class="current">0:00</span><span> / </span><span class="duration">0:00</span></li><li id="loop" class="right"><i class="fa fa-repeat"></i><span class="single">1</span></li><li id="shuffle" class="right"><i class="fa fa-random"></i></li></ul>' +
                        '<div id="timeline"><span class="line"></span><span class="progress"></span><span class="circle"></span></div></nav>' +
                        '<ul class="playList"></ul>';
                    status.container.html(htmlCode);
                }

                renderFrame();
                status.totalVideos = status.playList.length - 1;

                function renderList(data) {
                    var htmlCode = !data ? '' : data.map(function (obj, i) {
                        return ('<li>' + (i + 1) + '. ' + obj.title + ((obj.artist) ? ('<span class="artist">' + obj.artist + '</span>') : '') + '</li>')
                    });
                    $('.playList').html(htmlCode);
                }

                renderList(status.playList);

                function bindCtrs() {
                    status.container.on('click', '#play', fns.togglePlay)
                        .on('click', '#prev', fns.prevVideo)
                        .on('click', '#next', fns.nextVideo)
                        .on('click', '#shuffle', fns.toggleShuffle)
                        .on('click', '#loop', fns.toggleLoop)
                        .on('click', '.playList li', function () {
                            status.currentPlay = $(this).index();
                            status.autoPlay = true;
                            fns.setCurrentVideo();
                        })
                }

                bindCtrs();
                function setPlayerHeight() {
                    var _ratio = status.height / status.width;
                    setTimeout(function () {
                        var w_w = parseInt($(window).width());
                        status.width = (w_w > 720) ? 720 : w_w;
                        status.height = status.width * _ratio;
                        $('#playerWrap').css('height', status.height);
                        status.container.find('iframe').css('height', status.height);
                    }, 30)
                }

                $(window).on('resize', setPlayerHeight).trigger('resize');
                fns.setCurrentVideo();
                fns.getCurrentTime();
                setTimeout(function () {
                    fns.seekTime();
                }, 10);
            },
            setCurrentVideo: function (num) {
                var _num = num ? num : status.currentPlay;
                //##### debug #####
                if (status.debug == true) {
                    console.log('現在播放的影片: ' + _num);
                }
                $('#time').hide(0);
                $('.playList li').eq(_num).addClass('current').siblings('li').removeClass('current');
                fns.focusCurrent();
                status.videoType = status.playList[_num].type;
                fns.stopAll();
                switch (status.videoType) {
                    case 'youtube':
                        // youtube播放器初始化
                        //##### debug #####
                        if (status.debug) {
                            console.log('youtube初始化開始');
                        }
                        YTfns.init();
                        status.container.find('#YTbox').show(0).siblings('.player').hide(0);
                        break;
                    case 'tvp':
                        // 騰訊播放器初始化
                        //##### debug #####
                        if (status.debug) {
                            console.log('騰訊初始化開始');
                        }
                        TVPfns.init();
                        status.container.find('#TVPbox').show(0).siblings('.player').hide(0);
                        break;
                }
            },
            stopAll: function () {
                if (status.ytInited) {
                    YTfns.playToggle('pause');
                }
                if (status.tvpInited)
                    TVPfns.playToggle('pause');
            },
            nextVideo: function () {
                if (status.shuffle == true) {
                    status.currentPlay = fns.shuffle();
                } else {
                    switch (status.loop) {
                        case 0:
                            if (status.currentPlay < status.totalVideos) {
                                status.currentPlay++;
                            } else {
                                status.currentPlay = 0;
                                if (!this.id || this.id != 'next') {
                                    status.autoPlay = false;
                                }
                            }
                            break;
                        case 1:
                            status.currentPlay < status.totalVideos ? status.currentPlay++ : status.currentPlay = 0;
                            break;
                    }
                }
                setTimeout(function () {
                    fns.setCurrentVideo();
                }, 10);
            },
            prevVideo: function () {
                if (status.shuffle == true) {
                    status.currentPlay = fns.shuffle();
                } else {
                    status.currentPlay == 0 ? status.currentPlay = status.totalVideos : status.currentPlay--;
                }
                fns.setCurrentVideo();
            },
            shuffle: function () {
                var _shuffle = Math.floor(Math.random() * (status.totalVideos + 1));
                while (_shuffle == status.currentPlay) {
                    _shuffle = Math.floor(Math.random() * (status.totalVideos + 1));
                }
                //##### debug #####
                if (status.debug == true) {
                    console.log('隨機播放狀態: ' + _shuffle);
                }
                return _shuffle
            },
            togglePlay: function () {
                status.autoPlay = true;
                if (status.videoType == 'youtube') {
                    YTfns.playToggle();
                } else if (status.videoType == 'tvp') {
                    TVPfns.playToggle();
                }
            },
            toggleShuffle: function () {
                if (status.shuffle == false) {
                    status.shuffle = !status.shuffle;
                    status.container.find('#shuffle').addClass('active');
                } else {
                    status.shuffle = !status.shuffle;
                    status.container.find('#shuffle').removeClass('active');
                }
            },
            toggleLoop: function () {
                status.loop < 2 ? status.loop++ : status.loop = 0;
                var _ctr = status.container.find('#loop');
                switch (status.loop) {
                    case 0:
                        _ctr.attr('class', 'right');
                        break;
                    case 1:
                        _ctr.addClass('active');
                        break;
                    case 2:
                        _ctr.addClass('single');
                        break;
                }
                //##### debug #####
                if (status.debug) {
                    console.log('循環狀態(0:無, 1:全部, 2:單支): ' + status.loop);
                }
            },
            getCurrentTime: function () {
                setInterval(function () {
                    var _duration = status.duration,
                        m, s, m_c, s_c;
                    switch (status.videoType) {
                        case 'youtube':
                            if (status.ytInited)
                                status.currentTime = YTfns.getCurrentTime();
                            break;
                        case 'tvp':
                            if (status.tvpInited)
                                status.currentTime = TVPfns.getCurrentTime();
                            break;
                    }
                    m = String(Math.floor(_duration / 60));
                    s = String(_duration % 60);
                    if (s.length == 1) {
                        s = '0' + s;
                    }
                    m_c = String(Math.floor(status.currentTime / 60));
                    s_c = String(status.currentTime % 60);
                    if (s_c.length == 1) {
                        s_c = '0' + s_c;
                    }
                    $('#time .current').html(m_c + ':' + s_c);
                    $('#time .duration').html(m + ':' + s);
                    if (!status.isSeeking) {
                        $('#timeline .circle').css('left', ((100 * status.currentTime / _duration) + '%'));
                        $('#timeline .progress').css('width', ((100 * status.currentTime / _duration) + '%'));
                    }
                }, 200);
            },
            setCurrentTime: function (time) {
                switch (status.videoType) {
                    case 'youtube':
                        YTfns.setCurrentTime(time);
                        break;
                    case 'tvp':
                        TVPfns.setCurrentTime(time);
                        break;
                }
            },
            seekTime: function () {
                var _line = $('#timeline'),
                    _line_width, drag_ori, currentPosition, _limit;

                function press(e) {
                    status.isSeeking = true;
                    _line_width = parseInt(_line.width());
                    drag_ori = parseInt(_line.offset().left);
                    _limit = drag_ori + _line_width;
                    if ('createTouch' in document) {
                        currentPosition = parseInt(e.touches[0].pageX) - drag_ori;
                        document.addEventListener("touchmove", drag, false);
                        document.addEventListener("touchend", release, false);
                    } else {
                        currentPosition = parseInt(e.pageX) - drag_ori;
                        $(document).on({
                            mousemove: drag,
                            mouseup: release
                        });
                    }
                    _line.find('.circle').css('left', currentPosition);
                    _line.find('.progress').css('width', currentPosition);
                    //##### debug #####
                    if (status.debug) {
                        console.log('進度條起點位置: ' + drag_ori);
                        console.log('現在播放進度: ' + status.currentTime);
                        console.log('進度條終點位置: ' + _limit);
                    }
                }

                function drag(e) {
                    e.preventDefault();
                    if ('createTouch' in document) {
                        currentPosition = parseInt(e.touches[0].pageX) - drag_ori;
                    } else {
                        currentPosition = parseInt(e.pageX) - drag_ori;
                    }
                    if (currentPosition > _limit - drag_ori) {
                        currentPosition = _limit - drag_ori;
                    } else if (currentPosition < 0) {
                        currentPosition = 0;
                    }
                    _line.find('.circle').css('left', currentPosition);
                    _line.find('.progress').css('width', currentPosition);
                    //##### debug #####
                    if (status.debug) {
                        console.log('時間點拖移位置: ' + currentPosition);
                        console.log('播放時間點(秒): ' + Math.floor(currentPosition / _line_width));
                    }
                }

                function release() {
                    var setTime = status.duration * currentPosition / _line_width;
                    //##### debug #####
                    if (status.debug) {
                        console.log('設定播放時間點(秒): ' + setTime);
                    }
                    fns.setCurrentTime(setTime);
                    if ('createTouch' in document) {
                        document.removeEventListener("touchmove", drag, false);
                        document.removeEventListener("touchend", release, false);
                    } else {
                        $(document).off({
                            mousemove: drag,
                            mouseup: release
                        });
                    }
                    status.isSeeking = false;
                }

                if ('createTouch' in document) {
                    //##### debug #####
                    if (status.debug) {
                        console.log('加入觸控');
                    }
                    document.getElementById('timeline').addEventListener("touchstart", press, false);
                } else {
                    $('#timeline').on('mousedown', press);
                }

            },
            focusCurrent: function () {
                var listBox = $('.playList'),
                    listHeight = 300,
                    boxOffset = parseInt(listBox.scrollTop()),
                    currentItemOffset = $('.playList li').eq(status.currentPlay)[0].offsetTop;
                listBox.height(listHeight);
                //##### debug #####
                if (status.debug) {
                    console.log('清單scrollTop值: ' + boxOffset);
                    console.log('現正播放影片在列表的位置: ' + currentItemOffset);
                }

                if (status.shuffle) {
                    var _newPos = (status.currentPlay - 2 < 0) ? 0 : status.currentPlay - 2;
                    listBox.scrollTop($('.playList li').eq(_newPos)[0].offsetTop);
                } else {
                    if (boxOffset > currentItemOffset) {
                        listBox.scrollTop(currentItemOffset);
                    } else if (boxOffset + listHeight - 50 <= currentItemOffset) {
                        listBox.scrollTop(currentItemOffset - 230);
                    }
                }
            }
        },
        TVPfns = {
            player: null,
            params: function (vid) {
                return {
                    video: {vid: vid},
                    playerType: 'html5',
                    width: 'auto',
                    height: 'auto',
                    autoplay: false,
                    isSkipLoadingAd: true,
                    isHtml5AutoBuffer: true,
                    isHtml5ShowPlayBtnOnPause: false,
                    isHtml5ShowLoadingAdOnChange: false,
                    isHtml5ShowLoadingAdOnReplay: false,
                    isHtml5ShowLoadingAdOnStart: false,
                    isHtml5UseUI: false,
                    isContinuePlay: false,
                    skipLoadingAdTime: 0,
                    onwrite: function () {
                        $('#TVPbox').find('video').attr('controls', false);
                    },
                    oninited: function () {
                        TVPfns.player = this;
                        if (status.tvpInited) {
                            //##### debug #####
                            if (status.debug) {
                                console.log('騰訊影片載入次數: ' + status.tvpCount);
                            }
                            delete tvp.Player.instance[status.tvpTagID + status.tvpCount];
                        }
                        status.tvpCount++;
                        status.tvpInited = true;
                        if (status.autoPlay && status.videoType == 'tvp') {
                            TVPfns.player.play();
                            status.autoPlay = true;
                        }
                        //##### debug #####
                        if (status.debug) {
                            console.log('騰訊播放器: ' + this);
                        }
                    },
                    onallended: function () {
                        status.playerState = 'pause';
                        status.container.find('#play').addClass('paused');
                        if (status.loop == 2) {
                            fns.setCurrentVideo();
                        } else {
                            if (status.currentPlay == status.totalVideos && status.loop == 0 && !status.shuffle) {
                                status.autoPlay = false;
                                //##### debug #####
                                if (status.debug) {
                                    console.log('最後一支影片 無循環 無隨機 --> 回到第一支影片停止播放');
                                }
                            }
                            $('#TVPbox').html('');
                            fns.nextVideo();
                            //##### debug #####
                            if (status.debug) {
                                console.log('下一支影片');
                            }
                        }
                    },
                    onplaying: function () {
                        status.playerState = 'play';
                        status.container.find('#play').removeClass('paused');
                        var _duration = parseInt(TVPfns.player.getDuration());
                        if (_duration != status.duration) {
                            status.duration = _duration;
                        }
                        status.height = parseInt($('#TVPbox').height());
                        status.autoPlay = true;
                        $(window).trigger('resize');
                        $('#time').show(0);
                        //##### debug #####
                        if (status.debug) {
                            console.log('騰訊 狀態: ' + status.playerState);
                        }
                    },
                    onpause: function () {
                        status.playerState = 'pause';
                        status.container.find('#play').addClass('paused');
                        //##### debug #####
                        if (status.debug) {
                            console.log('騰訊 狀態: ' + status.playerState);
                        }
                    },
                    onerror: function () {
                        console.log('書籤內的第 ' + status.currentPlay + ' 支影片連結已失效');
                    }
                }
            },
            init: function () {
                $('#TVPbox').createTVP(TVPfns.params(status.playList[status.currentPlay].id));
            },
            playToggle: function (pause) {
                if (status.playerState == 'play' || pause == 'pause') {
                    //##### debug #####
                    if (status.debug) {
                        console.log('騰訊 暫停');

                    }
                    TVPfns.player.pause();
                } else if (status.playerState == 'pause') {
                    //##### debug #####
                    if (status.debug) {
                        console.log('騰訊 播放');
                    }
                    TVPfns.player.play();
                }
            },
            getCurrentTime: function () {
                return parseInt(TVPfns.player.getPlaytime())
            },
            setCurrentTime: function (time) {
                TVPfns.player.setPlaytime(time);
            }
        },
        YTfns = {
            player: null,
            params: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                theme: 'dark',
                origin: location.origin
            },
            init: function () {
                if (!status.ytInited) {
                    YTfns.player = new YT.Player('YTbox', {
                        width: '100%',
                        videoId: status.playList[status.currentPlay].id,
                        playerVars: YTfns.params,
                        events: {
                            'onStateChange': function () {
                                switch (YTfns.player.getPlayerState()) {
                                    case 0:  //播放完畢
                                        status.playerState = 'pause';
                                        status.container.find('#play').addClass('paused');
                                        //判斷是否單首重複
                                        if (status.loop == 2) {
                                            fns.setCurrentVideo();
                                            //##### debug #####
                                            if (status.debug) {
                                                console.log('單支重複播放');
                                            }
                                        } else {
                                            //判斷是否放完清單且無開啟清單重複播放
                                            if (status.currentPlay == status.totalVideos && status.loop == 0 && !status.shuffle) {
                                                status.autoPlay = false;
                                                //##### debug #####
                                                if (status.debug) {
                                                    console.log('最後一支影片 無循環 無隨機 --> 回到第一支影片停止播放');
                                                }
                                            }
                                            fns.nextVideo();
                                            //##### debug #####
                                            if (status.debug) {
                                                console.log('下一支影片');
                                            }
                                        }
                                        break;
                                    case 1:  //播放
                                        status.playerState = 'play';
                                        status.container.find('#play').removeClass('paused');
                                        var _duration = parseInt(YTfns.player.getDuration());
                                        if (_duration != status.duration) {
                                            status.duration = _duration;
                                        }
                                        status.height = parseInt($('#YTbox').width()) / 2;
                                        status.autoPlay = true;
                                        $('#YTbox').height(status.height);
                                        $(window).trigger('resize');
                                        $('#time').show(0);
                                        //##### debug #####
                                        if (status.debug) {
                                            console.log('youtube 狀態: ' + status.playerState);
                                        }
                                        break;
                                    case 2:  //暫停
                                        status.playerState = 'pause';
                                        status.container.find('#play').addClass('paused');
                                        //##### debug #####
                                        if (status.debug) {
                                            console.log('youtube 狀態: ' + status.playerState);
                                        }
                                        break;
                                    case 3:  //緩衝中
                                        //##### debug #####
                                        if (status.debug) {
                                            console.log('youtube 狀態: 緩衝中');
                                        }
                                        //判斷是否須停止自動播放
                                        if (!status.autoPlay || status.videoType != 'youtube') {
                                            YTfns.player.stopVideo();
                                            status.autoPlay = true;
                                            //##### debug #####
                                            if (status.debug) {
                                                console.log('youtube 停止播放');
                                            }
                                        }
                                        break;
                                    case 5:
                                        if (status.autoPlay && status.videoType == 'youtube') {
                                            if('createTouch' in document){}else{
                                                YTfns.player.playVideo();
                                            }
                                        }
                                        //##### debug #####
                                        if (status.debug) {
                                            console.log('youtube狀態: 已載入');
                                        }
                                        break;
                                }
                            },
                            'onReady': function () {
                                if (status.autoPlay && status.videoType == 'youtube') {
                                    if('createTouch' in document){}else{
                                        YTfns.player.playVideo();
                                    }
                                }
                                status.ytInited = true;
                                //##### debug #####
                                if (status.debug) {
                                    console.log('youtube 初始化完成');
                                }
                            },
                            'onError': function () {
                                console.log('書籤內的第 ' + status.currentPlay + ' 支影片連結已失效');
                            }
                        }
                    });
                } else {
                    YTfns.player.cueVideoById({
                        videoId: status.playList[status.currentPlay].id,
                        startSeconds: 0
                    });
                }
            },
            playToggle: function (pause) {
                if (status.playerState == 'play' || pause == 'pause') {
                    //##### debug #####
                    if (status.debug) {
                        console.log('youtube 暫停');
                    }
                    YTfns.player.pauseVideo();
                } else if (status.playerState == 'pause') {
                    //##### debug #####
                    if (status.debug) {
                        console.log('youtube 播放');
                    }
                    YTfns.player.playVideo();
                }
            },
            getCurrentTime: function () {
                return parseInt(YTfns.player.getCurrentTime())
            },
            setCurrentTime: function (time) {
                YTfns.player.seekTo(time);
            }
        };
    fns.init();
}