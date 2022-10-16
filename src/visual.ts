/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import * as d3 from "d3";
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;

function appendDropdown(target: HTMLElement, label: HTMLElement, labelText: string, labelPositionLeft: string, select: HTMLElement, selectId: string) {

    label.innerHTML = labelText;
    label.style.position = "absolute";
    label.style.left = labelPositionLeft;
    select.id = selectId;
    label.appendChild(select);
    target.appendChild(label);

}

function refreshDropdown(options: VisualUpdateOptions, selectId: string) {

    let element: HTMLSelectElement = document.getElementById(selectId) as HTMLSelectElement;
    let optionValue = element.value;
    let dataViews = options.dataViews;

    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    if (selectId == "operationSelect") {

        let categories = dataViews[0].categorical.categories[0].values;
        let categoriesAsc = [...categories].sort(d3.ascending);

        for (let i = 0; i < categoriesAsc.length; i++) {

            let option = document.createElement("option");
            option.value = categoriesAsc[i].valueOf() as string;
            option.text = categoriesAsc[i].valueOf() as string;
            element.add(option);

            if (option.value == optionValue) {
                element.value = optionValue;
            }

        }

        if (element.selectedIndex == -1) {
            element.value = categoriesAsc[0].valueOf() as string;
        }

    } else {

        let values = dataViews[0].categorical.values;
        let displayNames = [];

        for (let i = 0; i < values.length; i++) {
            displayNames.push(values[i].source.displayName);
        }

        displayNames.sort(d3.ascending);
        for (let i = 0; i < displayNames.length; i++) {

            let option = document.createElement("option");
            option.value = displayNames[i];
            option.text = displayNames[i];
            element.add(option);

            if (option.value == optionValue) {
                element.value = optionValue;
            }

        }

        if (element.selectedIndex == -1) {
            element.value = displayNames[0];
        }

    }

}

interface ChartViewModel {
    dataPoints: ChartDataPoint[];
    highlight: ChartDataPoint[];
    operationLabel: string;
    xLabel: string;
    yLabel: string;
}

interface ChartDataPoint {
    operation: string;
    x: number;
    y: number;
}

function transformData(options: VisualUpdateOptions): ChartViewModel {

    let dataViews = options.dataViews;
    let operationValues = dataViews[0].categorical.categories[0].values;
    let measures = dataViews[0].categorical.values;

    let operationSelect: HTMLSelectElement = document.getElementById("operationSelect") as HTMLSelectElement;
    let operationOption = operationSelect.value;
    let xSelect: HTMLSelectElement = document.getElementById("xSelect") as HTMLSelectElement;
    let xOption = xSelect.value;
    let xValues = [];
    let ySelect: HTMLSelectElement = document.getElementById("ySelect") as HTMLSelectElement;
    let yOption = ySelect.value;
    let yValues = [];

    let chartDataPoints: ChartDataPoint[] = [];
    let chartHighlight: ChartDataPoint[] = [];

    for (let i = 0; i < measures.length; i++) {

        if (measures[i].source.displayName == xOption) {
            xValues = measures[i].values;
        }

        if (measures[i].source.displayName == yOption) {
            yValues = measures[i].values;
        }

    }

    for (let i = 0; i < operationValues.length; i++) {

        if (xValues[i] !== null && yValues[i] !== null) {

            let operation = operationValues[i].valueOf() as string;
            let x = xValues[i].valueOf() as number;
            let y = yValues[i].valueOf() as number;

            chartDataPoints.push({
                operation,
                x,
                y
            });

            if (operation == operationOption) {
                chartHighlight.push({
                    operation,
                    x,
                    y
                })

            }

        }

    }

    let operationOptions = [];
    let newOperationValues = [];

    for (const option of operationSelect.options) {
        operationOptions.push(option.label);
    }
    for (let i = 0; i < chartDataPoints.length; i++) {
        newOperationValues.push(chartDataPoints[i].operation);
    }
    for (let i = 0; i < operationOptions.length; i++) {
        if (!newOperationValues.includes(operationOptions[i])) {
            operationSelect.remove(i);
        }
    }
    if (!newOperationValues.includes(operationOption)) {
        operationSelect.value = [...newOperationValues].sort(d3.ascending)[0];
        operationOption = operationSelect.value;
    }

    for (let i = 0; i < chartDataPoints.length; i++) {

        let operation = chartDataPoints[i].operation;
        let x = chartDataPoints[i].x;
        let y = chartDataPoints[i].y;

        if (operation == operationOption) {
            chartHighlight.push({
                operation,
                x,
                y
            })
        }
    }

    return {
        dataPoints: chartDataPoints,
        highlight: chartHighlight,
        operationLabel: operationOption,
        xLabel: xOption,
        yLabel: yOption,
    };

}

function createChart(options: VisualUpdateOptions, svg: Selection<any>, chart: Selection<SVGElement>, highlight: Selection<SVGElement>, dataLabel: Selection<SVGElement>, averageLines: Selection<SVGElement>, grid: Selection<SVGElement>, xAxis: Selection<SVGElement>, yAxis: Selection<SVGElement>, button: HTMLElement) {

    refreshDropdown(options, "operationSelect");
    refreshDropdown(options, "xSelect");
    refreshDropdown(options, "ySelect");

    let width: number = options.viewport.width;
    let height: number = options.viewport.height;
    let marginLeft = 40;
    let marginRight = 80;
    let marginTop = 50;
    let marginBottom = 50;
    let xRange = [marginLeft, width - marginRight];
    let yRange = [height - marginBottom, marginTop];

    let viewModel: ChartViewModel = transformData(options);
    let data = viewModel.dataPoints;
    let highlightData = viewModel.highlight;
    let operationLabel: string = viewModel.operationLabel;
    let xLabel: string = viewModel.xLabel;
    let yLabel: string = viewModel.yLabel;
    let xDomain = d3.extent(data, d => d.x);
    let yDomain = d3.extent(data, d => d.y);
    let xScale = d3.scaleLinear(xDomain, xRange);
    let yScale = d3.scaleLinear(yDomain, yRange);
    let xMean = [d3.mean(data, d => d.x)];
    let yMean = [d3.mean(data, d => d.y)];

    let xAxisFunction = (xScale) => d3.axisBottom(xScale).ticks(5, "~s");
    let yAxisFunction = (yScale) => d3.axisLeft(yScale).ticks(5, "~s");
    let xGrid = (g, xScale) => g
        .selectAll(".xGrid")
        .data(xScale.ticks(5))
        .join(
            enter => enter.append("line")
                .attr("y1", marginTop / 2)
                .attr("y2", height - (marginBottom / 2))
                .classed("xGrid", true),
            update => update,
            exit => exit.remove()
        )
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d));
    let yGrid = (g, yScale) => g
        .selectAll(".yGrid")
        .data(yScale.ticks(5))
        .join(
            enter => enter.append("line")
                .attr("x1", marginLeft / 2)
                .attr("x2", width - (marginRight / 2))
                .classed("yGrid", true),
            update => update,
            exit => exit.remove()
        )
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d));
    let xAverageLine = (g, xScale) => g
        .selectAll(".xAverageLine")
        .data(xMean)
        .join(
            enter => enter.append("line")
                .attr("y1", marginTop / 2)
                .attr("y2", height - (marginBottom / 2))
                .classed("xAverageLine", true),
            update => update,
            exit => exit.remove()
        )
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d));
    let yAverageLine = (g, yScale) => g
        .selectAll(".yAverageLine")
        .data(yMean)
        .join(
            enter => enter.append("line")
                .attr("x1", marginLeft / 2)
                .attr("x2", width - (marginRight / 2))
                .classed("yAverageLine", true),
            update => update,
            exit => exit.remove()
        )
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d));
    let zoom = d3.zoom().scaleExtent([0, Infinity]).on("zoom", (event) => {

        let transform = event.transform;
        let xScaleZoomed = transform.rescaleX(xScale);
        let yScaleZoomed = transform.rescaleY(yScale);

        chart
            .attr("transform", transform)
            .attr("stroke-width", 5 / transform.k);

        highlight
            .selectAll("path")
            .attr("transform", transform)
            .attr("stroke-width", 10 / transform.k);
        highlight
            .selectAll("text")
            .attr("transform", transform)
            .attr("stroke-width", 1 / transform.k)
            .attr("font-size", 14 / transform.k);

        dataLabel
            .attr("transform", transform)
            .attr("stroke-width", 1 / transform.k)
            .attr("font-size", 14 / transform.k);

        xAxis
            .attr("transform", `translate(0, ${height - marginBottom})`)
            .call(xAxisFunction(xScaleZoomed))
            .call(g => g.selectAll(".domain, .xlabel").remove())
            .call(g => g.append("text")
                .attr("x", width - (marginRight / 4))
                .attr("y", marginBottom / 4)
                .attr("fill", "black")
                .attr("text-anchor", "end")
                .text(xLabel)
                .classed("xlabel", true)
            );

        yAxis
            .attr("transform", `translate(${marginLeft}, 0)`)
            .call(yAxisFunction(yScaleZoomed))
            .call(g => g.selectAll(".domain, .ylabel").remove())
            .call(g => g.append("text")
                .attr("x", -marginLeft * (3 / 4))
                .attr("y", marginTop / 2)
                .attr("fill", "black")
                .attr("text-anchor", "start")
                .text(yLabel)
                .classed("ylabel", true)
            );

        averageLines
            .call(xAverageLine, xScaleZoomed)
            .call(yAverageLine, yScaleZoomed);

        grid
            .call(xGrid, xScaleZoomed)
            .call(yGrid, yScaleZoomed);

    });

    svg.
        attr("viewBox", [0, 0, width, height]);

    chart
        .attr("stroke-linecap", "round")
        .attr("stroke", "black")
        .attr("opacity", 0.2)
        .selectAll("path")
        .data(data)
        .join("path")
        .attr("d", d => `M ${xScale(d.x)} ${yScale(d.y)} h 0`);

    highlight
        .selectAll("path")
        .data(highlightData)
        .join("path")
        .attr("stroke-linecap", "round")
        .attr("stroke", "red")
        .attr("d", d => `M ${xScale(d.x)} ${yScale(d.y)} h 0`);
    highlight
        .selectAll("text")
        .data(highlightData)
        .join("text")
        .attr("stroke", "black")
        .attr("dx", "0.5em")
        .attr("dy", "0.5em")
        .attr("x", d => xScale(d.x))
        .attr("y", d => yScale(d.y))
        .text(d => d.operation);

    dataLabel
        .attr("stroke", "black")
        .attr("opacity", 0.2)
        .selectAll("text")
        .data(data)
        .join("text")
        .attr("dx", "0.5em")
        .attr("dy", "0.5em")
        .attr("x", d => xScale(d.x))
        .attr("y", d => yScale(d.y))
        .text(d => d.operation);

    averageLines
        .attr("stroke", "blue")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "4 1");

    grid
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.1);

    svg
        .call(zoom)
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);

    button.onclick = () => {
        svg
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    };

    return {
        operationOption: operationLabel,
        xOption: xLabel,
        yOption: yLabel
    }

}

export class Visual implements IVisual {

    private target: HTMLElement;
    private button: HTMLElement;
    private operationLabel: HTMLElement;
    private operationSelect: HTMLElement;
    private operationOption: string;
    private xLabel: HTMLElement;
    private xSelect: HTMLElement;
    private xOption: string;
    private yLabel: HTMLElement;
    private ySelect: HTMLElement;
    private yOption: string;

    private svg: Selection<any>;
    private chart: Selection<SVGElement>;
    private highlight: Selection<SVGElement>;
    private dataLabel: Selection<SVGElement>;
    private averageLines: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private grid: Selection<SVGElement>;

    constructor(options: VisualConstructorOptions) {

        this.target = options.element;

        this.button = document.createElement("button");
        this.button.innerHTML = "Reset";
        this.target.appendChild(this.button);

        this.operationLabel = document.createElement("label");
        this.operationSelect = document.createElement("select");
        appendDropdown(this.target, this.operationLabel, "Operation: ", "100px", this.operationSelect, "operationSelect");
        this.operationOption = "";

        this.xLabel = document.createElement("label");
        this.xSelect = document.createElement("select");
        appendDropdown(this.target, this.xLabel, "x: ", "500px", this.xSelect, "xSelect");
        this.xOption = "";

        this.yLabel = document.createElement("label");
        this.ySelect = document.createElement("select");
        appendDropdown(this.target, this.yLabel, "y: ", "700px", this.ySelect, "ySelect");
        this.yOption = "";

        this.svg = d3.select(options.element)
            .append("svg")
            .classed("svg", true);
        this.chart = this.svg
            .append("g")
            .classed("chart", true);
        this.highlight = this.svg
            .append("g")
            .classed("highlight", true);
        this.dataLabel = this.svg
            .append("g")
            .classed("dataLabel", true);
        this.averageLines = this.svg
            .append("g")
            .classed("averageLines", true);
        this.xAxis = this.svg
            .append("g")
            .classed("xAxis", true);
        this.yAxis = this.svg
            .append("g")
            .classed("yAxis", true);
        this.grid = this.svg
            .append("g")
            .classed("grid", true);

    }

    public update(options: VisualUpdateOptions) {

        let optionValues = createChart(
            options,
            this.svg,
            this.chart,
            this.highlight,
            this.dataLabel,
            this.averageLines,
            this.grid,
            this.xAxis,
            this.yAxis,
            this.button
        );
        this.operationOption = optionValues.operationOption;
        this.xOption = optionValues.xOption;
        this.yOption = optionValues.yOption;

        this.operationSelect.onchange = () => {
            let optionValues = createChart(
                options,
                this.svg,
                this.chart,
                this.highlight,
                this.dataLabel,
                this.averageLines,
                this.grid,
                this.xAxis,
                this.yAxis,
                this.button
            );
            this.operationOption = optionValues.operationOption;
            this.xOption = optionValues.xOption;
            this.yOption = optionValues.yOption;
        };

        this.xSelect.onchange = () => {
            let optionValues = createChart(
                options,
                this.svg,
                this.chart,
                this.highlight,
                this.dataLabel,
                this.averageLines,
                this.grid,
                this.xAxis,
                this.yAxis,
                this.button
            );
            this.operationOption = optionValues.operationOption;
            this.xOption = optionValues.xOption;
            this.yOption = optionValues.yOption;
        };

        this.ySelect.onchange = () => {
            let optionValues = createChart(
                options,
                this.svg,
                this.chart,
                this.highlight,
                this.dataLabel,
                this.averageLines,
                this.grid,
                this.xAxis,
                this.yAxis,
                this.button
            );
            this.operationOption = optionValues.operationOption;
            this.xOption = optionValues.xOption;
            this.yOption = optionValues.yOption;
        };

    }

}