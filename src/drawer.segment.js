'use strict';

WaveSurfer.Drawer.Segment = Object.create(WaveSurfer.Drawer);

WaveSurfer.util.extend(WaveSurfer.Drawer.Segment, {
    initDrawer: function (params) {
        var my = this;

        setTimeout(function() {
            // override render function...this is a temporary hack
            if (WaveSurfer.Regions) {

                /* add wheel event listener */
                WaveSurfer.Region.init = function (params, wavesurfer) {
                    this.wavesurfer = wavesurfer;
                    this.wrapper = wavesurfer.drawer.wrapper;

                    this.id = params.id == null ? WaveSurfer.util.getId() : params.id;
                    this.start = Number(params.start) || 0;
                    this.end = params.end == null ?
                        // small marker-like region
                        this.start + (4 / this.wrapper.scrollWidth) * this.wavesurfer.getDuration() :
                        Number(params.end);
                    this.resize = params.resize === undefined ? true : Boolean(params.resize);
                    this.drag = params.drag === undefined ? true : Boolean(params.drag);
                    this.loop = Boolean(params.loop);
                    this.color = params.color || 'rgba(0, 0, 0, 0.1)';
                    this.data = params.data || {};
                    this.attributes = params.attributes || {};

                    this.maxLength = params.maxLength;
                    this.minLength = params.minLength;

                    this.bindInOut();
                    this.render();
                    this.wavesurfer.on('zoom', this.updateRender.bind(this));
                    my.on('wheel', this.updateRender.bind(this));

                    this.wavesurfer.fireEvent('region-created', this);
                };

                /* Update element's position, width, color. */
                WaveSurfer.Region.updateRender = function() {
                    var dur = this.wavesurfer.getDuration();
                    var width = my.width;

                    if (this.start < 0) {
                      this.start = 0;
                      this.end = this.end - this.start;
                    }
                    if (this.end > dur) {
                      this.end = dur;
                      this.start = dur - (this.end - this.start);
                    }

                    var segStart = my.params.segmentStart;
                    var segEnd = my.params.segmentStart + my.params.segmentDuration;

                    var l = WaveSurfer.util.map(this.start, segStart, segEnd, 0, width);
                    var w = WaveSurfer.util.map(this.end - this.start, 0, my.params.segmentDuration, 0, width);

                    if (this.element != null) {
                        this.style(this.element, {
                            left: l + 'px',
                            width: w + 'px',
                            backgroundColor: this.color,
                            cursor: this.drag ? 'move' : 'default'
                        });

                        for (var attrname in this.attributes) {
                            this.element.setAttribute('data-region-' + attrname, this.attributes[attrname]);
                        }

                        this.element.title = this.formatTime(this.start, this.end);
                    }

                };

                WaveSurfer.Region.bindEvents = function () {
                    var my = this;
                    window.console.log('WE ARE USING THIS');

                    this.element.addEventListener('mouseenter', function (e) {
                        my.fireEvent('mouseenter', e);
                        my.wavesurfer.fireEvent('region-mouseenter', my, e);
                    });

                    this.element.addEventListener('mouseleave', function (e) {
                        my.fireEvent('mouseleave', e);
                        my.wavesurfer.fireEvent('region-mouseleave', my, e);
                    });

                    this.element.addEventListener('click', function (e) {
                        e.preventDefault();
                        my.fireEvent('click', e);
                        my.wavesurfer.fireEvent('region-click', my, e);
                    });

                    this.element.addEventListener('dblclick', function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        my.fireEvent('dblclick', e);
                        my.wavesurfer.fireEvent('region-dblclick', my, e);
                    });

                    /* Drag or resize on mousemove. */
                    (this.drag || this.resize) && (function () {
                        var duration = my.wavesurfer.getDuration();
                        var drag;
                        var resize;
                        var startTime;

                        var onDown = function (e) {
                            e.stopPropagation();
                            window.console.log(my.wavesurfer.drawer.handleEvent(e));
                            startTime = my.wavesurfer.drawer.handleEvent(e) * duration;
                            window.console.log(startTime);

                            if (e.target.tagName.toLowerCase() == 'handle') {
                                if (e.target.classList.contains('wavesurfer-handle-start')) {
                                    resize = 'start';
                                } else {
                                    resize = 'end';
                                }
                            } else {
                                drag = true;
                            }
                        };
                        var onUp = function (e) {
                            if (drag || resize) {
                                window.console.log(e);
                                drag = false;
                                resize = false;
                                e.stopPropagation();
                                e.preventDefault();

                                my.fireEvent('update-end', e);
                                my.wavesurfer.fireEvent('region-update-end', my, e);
                            }
                        };
                        var onMove = function (e) {
                            if (drag || resize) {
                                window.console.log(my.wavesurfer.drawer.handleEvent(e));
                                var time = my.wavesurfer.drawer.handleEvent(e) * duration;
                                var delta = time - startTime;
                                startTime = time;
                                window.console.log(time);

                                // Drag
                                if (my.drag && drag) {
                                    my.onDrag(delta);
                                }

                                // Resize
                                if (my.resize && resize) {
                                    my.onResize(delta, resize);
                                }
                            }
                        };

                        my.element.addEventListener('mousedown', onDown);
                        my.element.addEventListener('touchstart', onDown);
                        my.wrapper.addEventListener('mousemove', onMove);
                        my.wrapper.addEventListener('touchmove', onMove);
                        document.body.addEventListener('mouseup', onUp);
                        document.body.addEventListener('touchend', onUp);

                        my.on('remove', function () {
                            document.body.removeEventListener('mouseup', onUp);
                            my.wrapper.removeEventListener('mousemove', onMove);
                        });

                        my.wavesurfer.on('destroy', function () {
                            document.body.removeEventListener('mouseup', onUp);
                        });
                    }());
                };
            }
            window.console.log('overriding wavesurfer regions!');
        }, 1);
    },

    createWrapper: function () {
        this.wrapper = this.container.appendChild(
            document.createElement('wave')
        );

        this.style(this.wrapper, {
            display: 'block',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: this.params.height + 'px'
        });

        if (this.params.fillParent || this.params.scrollParent) {
            this.style(this.wrapper, {
                width: '100%',
                overflowX: 'hidden',
                overflowY: 'hidden'
            });
        }

        this.setupWrapperEvents();
    },

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
        var start = this.params.segmentStart/this.totalDuration;
        var end = (this.params.segmentStart + this.params.segmentDuration) / this.totalDuration;
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
                my.fireEvent('click', e, my.handleEvent(e));
            }
        });

        // redraw when window is resized
        window.addEventListener('resize', function(e) {
            my.fireEvent('wheel', null);
        });

        function handleScroll(e) {
            if (!my.params.scrollParent) {return;}

            var delta = e.deltaX * (my.params.segmentDuration/100);
            var tempStart = my.params.segmentStart + delta;

            // constrain
            my.params.segmentStart = Math.max(Math.min(tempStart, my.totalDuration-my.params.segmentDuration), 0);
            my.fireEvent('wheel', e);
        }

        this.wrapper.addEventListener('wheel', handleScroll, false);
        this.wrapper.addEventListener('scroll', function(e) {
            e.stopPropagation();
            e.preventDefault();
        }, false);
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

    drawPeaks: function (peaks, length, totalDuration) {
        this.totalDuration = totalDuration;
        this.resetScroll();

        var bBox = this.wrapper.getBoundingClientRect();
        this.setWidth(bBox.width);

        // this.setWidth
        this.params.barWidth ?
            this.drawBars(peaks, 0) :
            this.drawWave(peaks, 0);
    },

    setWidth: function (width) {
        if (width == this.width) { return; }
        this.width = width / this.params.pixelRatio;
        this.updateSize();
    },

    drawBars: function (peaks, channelIndex) {
        window.console.warn('draw bars not yet implemented for drawer.segment');

        this.drawWave(peaks, channelIndex);
    },

    drawWave: function (peaks, channelIndex) {

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

        var peaksPerSecond = peaks.length / this.totalDuration;
        var peaksInWindow = Math.ceil(this.params.segmentDuration * peaksPerSecond);
        var firstPeak = ~~(this.params.segmentStart * peaksPerSecond);

        // scale
        var scale = this.width / peaksInWindow;

        // normalize
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
            for (var i = 0; i < peaksInWindow; i++) {
                var h = Math.abs(Math.round(peaks[firstPeak + i] / absmax * halfH));
                cc.lineTo(i * scale + $, halfH - h + offsetY);
            }

            // cc.lineTo(this.width, halfH);

            // Draw the bottom edge going backwards, to make a single
            // closed hull to fill.
            for (var i = peaksInWindow - 1; i >= 0; i--) {
                var h = -Math.abs( Math.round(peaks[firstPeak + i + 1] / absmax * halfH) );
                cc.lineTo(i * scale + $, halfH - h + offsetY);
            }

            cc.closePath();
            cc.fill();

            // Always draw a median line
            cc.fillRect(0, halfH + offsetY - $, this.width, $);

        }, this);
    },

    progress: function (totalProgressPercent, isPaused) {

        // totalProgress is 0 - 1 mapped to wavesurfer's total duration
        var totalTime = totalProgressPercent * this.totalDuration;

        // relProgress is 0 to 1 mapped to the current view
        var relProgress = WaveSurfer.util.map(totalTime, this.params.segmentStart, this.params.segmentStart + this.params.segmentDuration, 0, 1);

        var progress = relProgress;

        var minPxDelta = 1 / this.params.pixelRatio;
        var pos = Math.round(progress * this.width) * minPxDelta;

        if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
            this.lastPos = pos;

            if ( (relProgress < 0 || relProgress > 1) && this.params.autoCenter && !isPaused) {
                this.recenterOnPosition(relProgress);
            }

            this.updateProgress(progress);
        }
    },

    updateProgress: function (_relativeProgress) {
        var relativeProgress = Math.max(0, Math.min(_relativeProgress, 1));
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

    recenter: function (totalProgressPercent) {
        // totalProgressPercent is 0 to 1 mapped to wavesurfer's total duration
        var totalTime = totalProgressPercent * this.totalDuration;
        var relProgress = WaveSurfer.util.map(totalTime, this.params.segmentStart, this.params.segmentStart + this.params.segmentDuration, 0, 1);
        this.recenterOnPosition(relProgress, true);
    },

    recenterOnPosition: function (relProgress, immediate) {
        // if (relProgress >= 0 && relProgress <= 1) {return;}

        // relProgress is relative to current view where 0 is left, 1 is right
        // totalProgress is 0 - 1 mapped to wavesurfer's total duration
        var start = this.params.segmentStart/this.totalDuration;
        var end = (this.params.segmentStart + this.params.segmentDuration) / this.totalDuration;
        var totalProgress = WaveSurfer.util.map(relProgress, 0, 1, start, end);

        var half = ~~( this.params.segmentDuration / 2);
        var target = totalProgress*this.totalDuration - half; // target start time
        var offset = target - this.params.segmentStart;
        var maxScroll = this.totalDuration - this.params.segmentDuration;

        if (maxScroll == 0) {
            // no need to continue if scrollbar is not there
            return;
        }

        // if the cursor is currently visible...
        if (!immediate && -half <= offset && offset < half) {
            // we'll limit the "re-center" rate.
            var rate = 5;
            offset = Math.max(-rate, Math.min(rate, offset));
            target = this.params.segmentStart + offset;
        }

        // limit target to valid range (0 to maxScroll)
        target = Math.max(0, Math.min(maxScroll, target));

        if (target != this.params.segmentStart) {
            this.params.segmentStart = target;

            // trigger redraw from "wheel" event
            this.fireEvent('wheel', null);
        }

    },


});
