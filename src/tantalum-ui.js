(function(exports) {
    function stripClass(node, className) {
        node.className = node.className.replace(new RegExp('(?:^|\\s)' + className + '(?!\\S)'), '');
    }
    function addClass(node, className) {
        if (node.className.indexOf(className) == -1)
            node.className += " " + className;
    }

    exports.ButtonGroup = function(targetId, vertical, labels, selectionCallback) {
        this.selectionCallback = selectionCallback;
        this.selectedButton = 0;
        
        var target = document.getElementById(targetId);
        if (!target) /* Silently failing is always the best option! I am a good developer! */
            return;
            
        this.group = document.createElement(vertical ? "ul" : "div");
        this.group.className = vertical ? "button-group-vert" : "button-group-horz";
        this.buttons = [];
        
        for (var i = 0; i < labels.length; ++i) {
            var button = document.createElement(vertical ? "li": "div");
            button.className = vertical ? "button-vert" : "button-horz";
            button.appendChild(document.createTextNode(labels[i]));
            
            this.buttons.push(button);
            this.group.appendChild(button);
            
            button.addEventListener("click", function(idx, event) {
                this.select(idx);
            }.bind(this, i));
        }
        this.select(0);
        
        target.parentNode.replaceChild(this.group, target);
    }

    exports.ButtonGroup.prototype.select = function(idx) {
        if (idx < 0 || idx >= this.buttons.length)
            return;
        
        stripClass(this.buttons[this.selectedButton], "active");
        addClass(this.buttons[idx], "active");
        
        if (this.selectedButton != idx && this.selectionCallback)
            this.selectionCallback(idx);
        this.selectedButton = idx;
    }

    exports.ProgressBar = function(targetId, hasLabel) {
        var target = document.getElementById(targetId);
        if (!target)
            return;
            
        var progressBackground = document.createElement("div");
        progressBackground.className = "progress";
        
        this.progressBar = document.createElement("div");
        this.progressBar.className = "progress-bar";
        progressBackground.appendChild(this.progressBar);
        
        this.setProgress(0.0);
        
        var parent = target.parentNode;
        parent.replaceChild(progressBackground, target);
            
        if (hasLabel) {
            this.label = document.createElement("p");
            this.label.className = "progress-label";
            parent.insertBefore(this.label, progressBackground.nextSibling);
        }
    }
    
    exports.ProgressBar.prototype.getProgress = function() {
        return this.progressFraction;
    }

    exports.ProgressBar.prototype.setProgress = function(progressFraction) {
        this.progressFraction = progressFraction;
        this.progressPercentage = Math.min(Math.max(Math.floor(progressFraction*100.0), 0), 100);
        this.progressBar.style.width = this.progressPercentage.toString() + "%";
    }
    
    exports.ProgressBar.prototype.setProgressWithoutTransition = function(progressFraction) {
        addClass(this.progressBar, "notransition");
        this.setProgress(progressFraction);
        this.progressBar.offsetHeight; /* Flush CSS changes */
        stripClass(this.progressBar, "notransition");
    }

    exports.ProgressBar.prototype.setLabel = function(text) {
        if (this.label)
            this.label.textContent = text;
    }

    exports.ProgressBar.prototype.getProgressPercentage = function() {
        return this.progressPercentage;
    }

    exports.Slider = function(targetId, minValue, maxValue, hasLabel, callback) {
        var target = document.getElementById(targetId);
        if (!target)
            return;
            
        this.sliderBackground = document.createElement("div");
        this.sliderBackground.className = "slider";
        
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.callback = callback;
        
        this.sliderBar = document.createElement("div");
        this.sliderBar.className = "slider-bar";
        this.sliderBackground.appendChild(this.sliderBar);
        
        this.sliderHandle = document.createElement("a");
        this.sliderHandle.className = "slider-handle";
        this.sliderBackground.appendChild(this.sliderHandle);
        
        var mouseMoveListener = this.mouseMove.bind(this);
        function mouseUpListener(event) {
            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseup", mouseUpListener);
        }
        
        this.sliderHandle.addEventListener("mousedown", function(event) {
            event.preventDefault();
            document.addEventListener("mousemove", mouseMoveListener);
            document.addEventListener("mouseup", mouseUpListener);
        });
        
        var parent = target.parentNode;
        parent.replaceChild(this.sliderBackground, target);
        
        if (hasLabel) {
            this.label = document.createElement("p");
            this.label.className = "slider-label";
            parent.insertBefore(this.label, this.sliderBackground.nextSibling);
        }

        this.setPosition(0.45);
    }

    exports.Slider.prototype.mouseMove = function(event) {
        var rect = this.sliderBackground.getBoundingClientRect();
        this.setPosition((event.clientX - rect.left)/(rect.right - rect.left));
    }

    exports.Slider.prototype.setLabel = function(text) {
        if (this.label)
            this.label.textContent = text;
    }
    
    exports.Slider.prototype.setValue = function(value) {
        value = Math.min(this.maxValue, Math.max(this.minValue, value));
        if (value != this.value) {
            this.value = value;
            var percentage = Math.max(Math.min(Math.floor(100.0*(value - this.minValue)/(this.maxValue - this.minValue)), 100.0), 0.0);
            this.sliderHandle.style.left = this.sliderBar.style.width = percentage.toString() + "%";
            
            if (this.callback)
                this.callback(value);
        }
    }

    exports.Slider.prototype.setPosition = function(position) {
        this.setValue(Math.floor(this.minValue + position*(this.maxValue - this.minValue)));
    }

    exports.Slider.prototype.show = function(show) {
        var display = show ? "block" : "none";
        this.sliderBackground.style.display = display;
        if (this.label)
            this.label.style.display = display;
    }

    exports.ButtonGrid = function(targetId, numCols, labels, selectionCallback) {
        var target = document.getElementById(targetId);
        if (!target)
            return;

        this.cols = numCols;
        this.selectionCallback = selectionCallback;
        this.selectedButton = 0;
        
        this.container = document.createElement("div");
        this.container.className = "button-grid";
        
        this.columns = [];
        for (var i = 0; i < this.cols; ++i) {
            var column = document.createElement("div");
            column.className = "button-grid-column";
            
            this.container.appendChild(column);
            this.columns.push(column);
        }
        
        this.cells = [];
        for (var i = 0; i < labels.length; ++i) {
            var column = i % this.cols;
            var cell = document.createElement("div");
            cell.className = "button stretch-button button-grid-button";
            cell.appendChild(document.createTextNode(labels[i]));
            
            if (i == 0)
                addClass(cell, "button-grid-tl");
            if (i == this.cols - 1)
                addClass(cell, "button-grid-tr");
            if (i + this.cols >= labels.length) {
                if (column == 0)
                    addClass(cell, "button-grid-bl");
                if (column == this.cols - 1 || i == labels.length - 1)
                    addClass(cell, "button-grid-br");
            }
            
            cell.addEventListener("click", function(idx, event) {
                this.select(idx);
            }.bind(this, i));
            
            this.columns[column].appendChild(cell);
            this.cells.push(cell);
        }
        
        this.select(0);
        
        target.parentNode.replaceChild(this.container, target);
    }

    exports.ButtonGrid.prototype.select = function(idx) {
        if (idx < 0 || idx >= this.cells.length)
            return;
        
        stripClass(this.cells[this.selectedButton], "active");
        addClass(this.cells[idx], "active");
        
        if (this.selectedButton != idx && this.selectionCallback)
            this.selectionCallback(idx);
        this.selectedButton = idx;
    }

    exports.ButtonGrid.prototype.show = function(show) {
        this.container.style.display = show ? "flex" : "none";
    }

    exports.MouseListener = function(target, callback) {
        this.target = target;
        this.callback = callback;
        this.mouseUpHandler = this.mouseUp.bind(this);
        this.mouseMoveHandler = this.mouseMove.bind(this);
        
        target.addEventListener('mousedown', this.mouseDown.bind(this));
    }

    exports.MouseListener.prototype.mouseDown = function(evt) {
        evt.preventDefault();
        this.mouseStart = this.mapMouseEvent(evt);
        this.callback(this.mouseStart, this.mouseStart);
        document.addEventListener('mouseup', this.mouseUpHandler);
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    exports.MouseListener.prototype.mouseUp = function(evt) {
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    exports.MouseListener.prototype.mouseMove = function(evt) {
        this.callback(this.mouseStart, this.mapMouseEvent(evt));
    }

    exports.MouseListener.prototype.mapMouseEvent = function(evt) { 
        var rect = this.target.getBoundingClientRect();
        return [evt.clientX - rect.left, evt.clientY - rect.top];
    }
})(window.tui = window.tui || {});