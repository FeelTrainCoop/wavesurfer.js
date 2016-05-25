'use strict';

WaveSurfer.Drawer.Segment = Object.create(WaveSurfer.Drawer);

// duration of original audio file in seconds
var totalDuration = 0;

// duration of segment in seconds
var segmentDuration = 100;

// start of segment in seconds
var segmentStart = 5;

WaveSurfer.util.extend(WaveSurfer.Drawer.Segment, {
    createElements: function() {
        var waveCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: 1,
                left: 0,
                top: 0,
                bottom: 0
            })
        );
        this.waveCc = waveCanvas.getContext('2d');

        this.progressWave = this.wrapper.appendChild(
            this.style(document.createElement('wave'), {
                position: 'absolute',
                zIndex: 2,
                left: 0,
                top: 0,
                bottom: 0,
                overflow: 'hidden',
                width: '0',
                display: 'none',
                boxSizing: 'border-box',
                borderRightStyle: 'solid',
                borderRightWidth: this.params.cursorWidth + 'px',
                borderRightColor: this.params.cursorColor
            })
        );

        if (this.params.waveColor != this.params.progressColor) {
            var progressCanvas = this.progressWave.appendChild(
                document.createElement('canvas')
            );
            this.progressCc = progressCanvas.getContext('2d');
        }

        // hack to override event listeners
        // var self = this;
        // window.setTimeout(function() {
        //     self.unAll();

        //     self.on('scroll', function (e) {
        //         e.preventDefault();
        //         // e.stopPropagation();
        //         window.console.log('scrolling');
        //     });

        //     self.on('click', function (e, progress) {
        //         window.console.log('got click with progress ', progress, e);

        //     });
        // }, 2);
    },

    handleEvent: function (e) {
        e.preventDefault();

        var bbox = this.wrapper.getBoundingClientRect();

        var nominalWidth = this.width;
        var parentWidth = this.getWidth();

        var progress;

        if (!this.params.fillParent && nominalWidth < parentWidth) {
            progress = ((e.clientX - bbox.left) * this.params.pixelRatio / nominalWidth) || 0;

            if (progress > 1) {
                progress = 1;
            }
        } else {
            progress = ((e.clientX - bbox.left + this.wrapper.scrollLeft) / this.wrapper.scrollWidth) || 0;
        }

        // relProgress is 0 to 1 mapped to the current view
        var relProgress = progress;

        // totalProgress is 0 - 1 mapped to wavesurfer's total duration
        var start = segmentStart/totalDuration;
        var end = (segmentStart + segmentDuration) / totalDuration;
        var totalProgress = WaveSurfer.util.map(relProgress, 0, 1, start, end);
        return totalProgress;
    },

    setupWrapperEvents: function () {
        var my = this;

        this.wrapper.addEventListener('click', function (e) {
            var scrollbarHeight = my.wrapper.offsetHeight - my.wrapper.clientHeight;
            if (scrollbarHeight != 0) {
                // scrollbar is visible.  Check if click was on it
                var bbox = my.wrapper.getBoundingClientRect();
                if (e.clientY >= bbox.bottom - scrollbarHeight) {
                    // ignore mousedown as it was on the scrollbar
                    return;
                }
            }

            if (my.params.interact) {
                window.console.log('making a click');
                my.fireEvent('click', e, my.handleEvent(e));
            }
        });

        this.wrapper.addEventListener('scroll', function (e) {
            my.fireEvent('scroll', e);
        });
    },

    updateSize: function () {
        var width = Math.round(this.width / this.params.pixelRatio);

        this.waveCc.canvas.width = this.width;
        this.waveCc.canvas.height = this.height;
        this.style(this.waveCc.canvas, { width: width + 'px'});

        this.style(this.progressWave, { display: 'block'});

        if (this.progressCc) {
            this.progressCc.canvas.width = this.width;
            this.progressCc.canvas.height = this.height;
            this.style(this.progressCc.canvas, { width: width + 'px'});
        }

        this.clearWave();
    },

    clearWave: function () {
        this.waveCc.clearRect(0, 0, this.width, this.height);
        if (this.progressCc) {
            this.progressCc.clearRect(0, 0, this.width, this.height);
        }
    },

    drawPeaks: function (peaks, length, _totalDuration) {
        totalDuration = _totalDuration;
        this.resetScroll();

        var bBox = this.wrapper.getBoundingClientRect();
        this.setWidth(bBox.width);

        // this.setWidth
        this.params.barWidth ?
            this.drawBars(peaks, 0, totalDuration) :
            this.drawWave(peaks, 0, totalDuration);
    },

    setWidth: function (width) {
        if (width == this.width) { return; }

        this.width = width;

        // if (this.params.fillParent || this.params.scrollParent) {
        //     this.style(this.wrapper, {
        //         width: ''
        //     });
        // } else {
        //     this.style(this.wrapper, {
        //         width: ~~(this.width / this.params.pixelRatio) + 'px'
        //     });
        // }

        this.updateSize();
    },

    drawBars: function (peaks, channelIndex, totalDuration) {
        // Split channels
        if (peaks[0] instanceof Array) {
            var channels = peaks;
            if (this.params.splitChannels) {
                this.setHeight(channels.length * this.params.height * this.params.pixelRatio);
                channels.forEach(this.drawWave, this);
                return;
            } else {
                peaks = channels[0];
            }
        }

    },

    drawWave: function (peaks, channelIndex, totalDuration) {
        // Split channels
        if (peaks[0] instanceof Array) {
            var channels = peaks;
            if (this.params.splitChannels) {
                this.setHeight(channels.length * this.params.height * this.params.pixelRatio);
                channels.forEach(this.drawWave, this);
                return;
            } else {
                peaks = channels[0];
            }
        }

        // Support arrays without negative peaks
        var hasMinValues = [].some.call(peaks, function (val) { return val < 0; });
        if (!hasMinValues) {
            var reflectedPeaks = [];
            for (var i = 0, len = peaks.length; i < len; i++) {
                reflectedPeaks[2 * i] = peaks[i];
                reflectedPeaks[2 * i + 1] = -peaks[i];
            }
            peaks = reflectedPeaks;
        }

        // A half-pixel offset makes lines crisp
        var $ = 0.5 / this.params.pixelRatio;
        var height = this.params.height * this.params.pixelRatio;
        var offsetY = height * channelIndex || 0;
        var halfH = height / 2;

        // length is 30 seconds
        var sampleRate = ~~(peaks.length / totalDuration);
        var length = ~~(segmentDuration * sampleRate);
        var offset = 0;
        this.sampleRate = sampleRate;

        // scale
        var scale = 1;
        if (this.params.fillParent && this.width != length) {
            scale = this.width / length;
        }

        // noramlize
        var absmax = 1;
        if (this.params.normalize) {
            var max = Math.max.apply(Math, peaks);
            var min = Math.min.apply(Math, peaks);
            absmax = -min > max ? -min : max;
        }

        // set up color
        this.waveCc.fillStyle = this.params.waveColor;
        if (this.progressCc) {
            this.progressCc.fileStyle = this.params.progressColor;
        }

        // draw wave and progress
        [ this.waveCc, this.progressCc ].forEach(function (cc) {
            if (!cc) {return; }

            cc.beginPath();
            cc.moveTo($, halfH + offsetY);

            // draw segment top
            for (var i = 0; i < length; i++) {
                var h = Math.round(peaks[2 * i] / absmax * halfH);
                cc.lineTo(i * scale + $, halfH - h + offsetY);
            }

            // Draw the bottom edge going backwards, to make a single
            // closed hull to fill.
            for (var i = length - 1; i >= 0; i--) {
                var h = Math.round(peaks[2 * i + 1] / absmax * halfH);
                cc.lineTo(i * scale + $, halfH - h + offsetY);
            }

            cc.closePath();
            cc.fill();

            // Always draw a median line
            cc.fillRect(0, halfH + offsetY - $, this.width, $);

        }, this);
    },

    progress: function (totalProgress) {
        // totalProgress is 0 - 1 mapped to wavesurfer's total duration
        var totalTime = totalProgress * totalDuration;

        // relProgress is 0 to 1 mapped to the current view
        var relProgress = WaveSurfer.util.map(totalTime, segmentStart, segmentStart + segmentDuration, 0, 1);

        var progress = relProgress;

        var minPxDelta = 1 / this.params.pixelRatio;
        var pos = Math.round(progress * this.width) * minPxDelta;

        if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
            this.lastPos = pos;

            if (this.params.scrollParent && this.params.autoCenter) {
                var newPos = ~~(this.wrapper.scrollWidth * progress);
                this.recenterOnPosition(newPos);
            }

            this.updateProgress(progress);
        }
    },

    updateProgress: function (relativeProgress) {
        var pos = Math.round(
            this.width * relativeProgress
        ) / this.params.pixelRatio;
        this.style(this.progressWave, { width: pos + 'px' });
    },

    resetScroll: function () {
        if (this.wrapper !== null) {
            this.wrapper.scrollLeft = 0;
        }
    },

    recenter: function (percent) {
        var position = this.wrapper.scrollWidth * percent;
        this.recenterOnPosition(position, true);
    },

    recenterOnPosition: function (position, immediate) {
        var scrollLeft = this.wrapper.scrollLeft;
        var half = ~~(this.wrapper.clientWidth / 2);
        var target = position - half;
        var offset = target - scrollLeft;
        var maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;

        if (maxScroll == 0) {
            // no need to continue if scrollbar is not there
            return;
        }

        // if the cursor is currently visible...
        if (!immediate && -half <= offset && offset < half) {
            // we'll limit the "re-center" rate.
            var rate = 5;
            offset = Math.max(-rate, Math.min(rate, offset));
            target = scrollLeft + offset;
        }

        // limit target to valid range (0 to maxScroll)
        target = Math.max(0, Math.min(maxScroll, target));
        // no use attempting to scroll if we're not moving
        if (target != scrollLeft) {
            this.wrapper.scrollLeft = target;
        }

    },


});