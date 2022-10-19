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

import * as aq from "arquero";

function addDropdownOptions(options: VisualUpdateOptions, selectId: string) {

    let select: HTMLSelectElement = document.getElementById(selectId) as HTMLSelectElement;
    let optionValue = select.value;
    let dataViews = options.dataViews;

    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }

    if (selectId == "regionSelect") {

        let option = document.createElement("option");
        option.value = "";
        option.text = "--Select a region to highlight--";
        select.add(option);

        let regions = dataViews[0].categorical.categories[1].values;
        let regionsUniqueAsc = [...new Set(regions)].sort(d3.ascending);

        for (let i = 0; i < regionsUniqueAsc.length; i++) {

            let option = document.createElement("option");
            option.value = regionsUniqueAsc[i].valueOf() as string;
            option.text = regionsUniqueAsc[i].valueOf() as string;
            select.add(option);

            if (option.value == optionValue) {
                select.value = option.value;
            }

        }

    } else if (selectId == "operationSelect") {

        let option = document.createElement("option");
        option.value = "";
        option.text = "--Select an operation to highlight--";
        select.add(option);

        let operations = dataViews[0].categorical.categories[2].values;
        let operationsUniqueAsc = [...new Set(operations)].sort(d3.ascending);

        for (let i = 0; i < operationsUniqueAsc.length; i++) {

            let option = document.createElement("option");
            option.value = operationsUniqueAsc[i].valueOf() as string;
            option.text = operationsUniqueAsc[i].valueOf() as string;
            select.add(option);

            if (option.value == optionValue) {
                select.value = option.value;
            }

        }

    } else if (selectId == "xSelect" || selectId == "ySelect") {

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
            select.add(option);

            if (option.value == optionValue) {
                select.value = option.value;
            }

        }

    }

}

interface ChartViewModel {
    dataPoints: ChartDataPoint[];
    highlightRegion: ChartDataPoint[];
    highlightOperation: ChartDataPoint[];
    xLabel: string;
    yLabel: string;
}

interface ChartDataPoint {
    region: string;
    operation: string;
    x: number;
    y: number;
}

function updateOperationDropdown(chartDataPoints: ChartDataPoint[]) {

    let select: HTMLSelectElement = document.getElementById("operationSelect") as HTMLSelectElement;
    let optionValue = select.value;

    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }

    let option = document.createElement("option");
    option.value = "";
    option.text = "--Select an operation to highlight--";
    select.add(option);

    let operationOptions = [];

    for (let i = 0; i < chartDataPoints.length; i++) {
        operationOptions.push(chartDataPoints[i].operation);
    }

    let operationOptionsUniqueAsc = [...new Set(operationOptions)].sort(d3.ascending);

    for (let i = 0; i < operationOptionsUniqueAsc.length; i++) {

        let option = document.createElement("option");
        option.value = operationOptionsUniqueAsc[i].valueOf() as string;
        option.text = operationOptionsUniqueAsc[i].valueOf() as string;
        select.add(option);

        if (option.value == optionValue) {
            select.value = option.value;
        }

    }

}

function transformData(options: VisualUpdateOptions): ChartViewModel {

    let dataViews = options.dataViews;
    let yearValues = dataViews[0].categorical.categories[0].values;
    let regionValues = dataViews[0].categorical.categories[1].values;
    let operationValues = dataViews[0].categorical.categories[2].values;
    let measures = dataViews[0].categorical.values;

    let regionSelect: HTMLSelectElement = document.getElementById("regionSelect") as HTMLSelectElement;
    let regionOption = regionSelect.value;
    let operationSelect: HTMLSelectElement = document.getElementById("operationSelect") as HTMLSelectElement;
    let operationOption = operationSelect.value;
    let xSelect: HTMLSelectElement = document.getElementById("xSelect") as HTMLSelectElement;
    let xOption = xSelect.value;
    let xValues = [];
    let ySelect: HTMLSelectElement = document.getElementById("ySelect") as HTMLSelectElement;
    let yOption = ySelect.value;
    let yValues = [];

    let chartDataPoints: ChartDataPoint[] = [];
    let chartHighlightRegion: ChartDataPoint[] = [];
    let chartHighlightOperation: ChartDataPoint[] = [];

    for (let i = 0; i < measures.length; i++) {

        if (measures[i].source.displayName == xOption) {
            xValues = measures[i].values;
        }

        if (measures[i].source.displayName == yOption) {
            yValues = measures[i].values;
        }

    }

    let yearValuesUnique = [...new Set(yearValues)];

    if (yearValuesUnique.length == 1) {

        let dt = aq.table({
            "region": regionValues,
            "operation": operationValues,
            "x": xValues,
            "y": yValues
        })

        let aqData = dt
            .impute({ x: () => 0 })
            .impute({ y: () => 0 })
            .filter(d => d.x !== 0 || d.y !== 0)

        let aqObjects = aqData.objects();

        aqObjects.forEach(element => {

            let region = element["region"].valueOf() as string;
            let operation = element["operation"].valueOf() as string;
            let x = element["x"].valueOf() as number;
            let y = element["y"].valueOf() as number;

            chartDataPoints.push({
                region,
                operation,
                x,
                y
            });

            if (region == regionOption) {
                chartHighlightRegion.push({
                    region,
                    operation,
                    x,
                    y
                })

            }

            if (operation == operationOption) {
                chartHighlightOperation.push({
                    region,
                    operation,
                    x,
                    y
                })

            }

        });

        updateOperationDropdown(chartDataPoints);

        return {
            dataPoints: chartDataPoints,
            highlightRegion: chartHighlightRegion,
            highlightOperation: chartHighlightOperation,
            xLabel: xOption,
            yLabel: yOption,
        };

    } else {

        let dt = aq.table({
            "year": yearValues,
            "region": regionValues,
            "operation": operationValues,
            "x": xValues,
            "y": yValues
        });

        let minYear = aq.agg(dt, d => aq.op.min(d.year));
        let maxYear = aq.agg(dt, d => aq.op.max(d.year));

        let aqData = dt.params({ minYear: minYear, maxYear: maxYear })
            .filter((d, $) => d.year == $.minYear || d.year == $.maxYear)
            .impute({ x: () => 0 })
            .impute({ y: () => 0 })
            .groupby("region", "operation")
            .pivot("year", ["x", "y"])
            .filter((d, $) => d[`x_${$.minYear}`] !== 0 || d[`x_${$.maxYear}`] !== 0 || d[`y_${$.minYear}`] !== 0 || d[`y_${$.maxYear}`] !== 0)
            .derive({ x: (d, $) => d[`x_${$.maxYear}`] - d[`x_${$.minYear}`] })
            .derive({ y: (d, $) => d[`y_${$.maxYear}`] - d[`y_${$.minYear}`] })
            .select("region", "operation", "x", "y");

        let aqObjects = aqData.objects();

        aqObjects.forEach(element => {

            let region = element["region"].valueOf() as string;
            let operation = element["operation"].valueOf() as string;
            let x = element["x"].valueOf() as number;
            let y = element["y"].valueOf() as number;

            chartDataPoints.push({
                region,
                operation,
                x,
                y
            });

            if (region == regionOption) {
                chartHighlightRegion.push({
                    region,
                    operation,
                    x,
                    y
                })

            }

            if (operation == operationOption) {
                chartHighlightOperation.push({
                    region,
                    operation,
                    x,
                    y
                })

            }

        });

        updateOperationDropdown(chartDataPoints);

        return {
            dataPoints: chartDataPoints,
            highlightRegion: chartHighlightRegion,
            highlightOperation: chartHighlightOperation,
            xLabel: xOption,
            yLabel: yOption,
        };

    }

}

export class Visual implements IVisual {

    private target: HTMLElement;
    private button: HTMLElement;
    private regionSelect: HTMLElement;
    private operationSelect: HTMLElement;
    private xSelect: HTMLElement;
    private ySelect: HTMLElement;

    private svg: Selection<any>;
    private chart: Selection<SVGElement>;
    private highlightRegion: Selection<SVGElement>;
    private highlightOperation: Selection<SVGElement>;
    private dataLabel: Selection<SVGElement>;
    private averageLines: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private grid: Selection<SVGElement>;

    private appendDropdown(labelText: string, labelPositionTop: string, labelPositionLeft: string, selectId: string) {

        let label = document.createElement("label");
        let select = document.createElement("select");

        label.innerText = labelText;
        label.style.position = "absolute";
        label.style.top = labelPositionTop;
        label.style.left = labelPositionLeft;
        select.id = selectId;
        label.appendChild(select);
        this.target.appendChild(label);

        return select;

    }

    private drawChart(options: VisualUpdateOptions) {

        addDropdownOptions(options, "regionSelect");
        addDropdownOptions(options, "operationSelect");
        addDropdownOptions(options, "xSelect");
        addDropdownOptions(options, "ySelect");

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let marginLeft = 40;
        let marginRight = 80;
        let marginTop = 120;
        let marginBottom = 20;
        let xRange = [marginLeft, width - marginRight];
        let yRange = [height - marginBottom, marginTop];

        let viewModel: ChartViewModel = transformData(options);
        let data = viewModel.dataPoints;
        let highlightRegionData = viewModel.highlightRegion;
        let highlightOperationData = viewModel.highlightOperation;
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

            this.grid
                .call(xGrid, xScaleZoomed)
                .call(yGrid, yScaleZoomed);

            this.xAxis
                .attr("transform", `translate(0, ${height - marginBottom})`)
                .call(xAxisFunction(xScaleZoomed))
                .call(g => g.selectAll(".domain, .xlabel").remove())
                .call(g => g.append("text")
                    .attr("x", width - (marginRight / 4))
                    .attr("y", marginBottom / 4)
                    .attr("fill", "black")
                    .attr("font-weight", "600")
                    .attr("text-anchor", "end")
                    .text(xLabel)
                    .classed("xlabel", true)
                );

            this.yAxis
                .attr("transform", `translate(${marginLeft}, 0)`)
                .call(yAxisFunction(yScaleZoomed))
                .call(g => g.selectAll(".domain, .ylabel").remove())
                .call(g => g.append("text")
                    .attr("x", -marginLeft * (3 / 4))
                    .attr("y", marginTop / 2)
                    .attr("fill", "black")
                    .attr("font-weight", "600")
                    .attr("text-anchor", "start")
                    .text(yLabel)
                    .classed("ylabel", true)
                );

            this.averageLines
                .call(xAverageLine, xScaleZoomed)
                .call(yAverageLine, yScaleZoomed);

            this.chart
                .attr("transform", transform)
                .attr("stroke-width", 5 / transform.k);

            this.dataLabel
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

            this.highlightRegion
                .selectAll("path")
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);

            this.highlightOperation
                .selectAll("path")
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);
            this.highlightOperation
                .selectAll("text")
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

        });

        this.svg.
            attr("viewBox", [0, 0, width, height]);

        this.grid
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.1);

        this.averageLines
            .attr("stroke", "#76b7b2")
            .attr("stroke-width", "2")
            .attr("stroke-dasharray", "4 2");

        this.chart
            .attr("stroke", "black")
            .attr("stroke-linecap", "round")
            .attr("opacity", 0.2)
            .selectAll("path")
            .data(data)
            .join("path")
            .attr("d", d => `M ${xScale(d.x)} ${yScale(d.y)} h 0`);

        this.dataLabel
            .attr("color", "black")
            .attr("stroke-width", 0)
            .attr("font-weight", "600")
            .attr("opacity", 0.2)
            .selectAll("text")
            .data(data)
            .join("text")
            .attr("dx", "0.5em")
            .attr("dy", "0.5em")
            .attr("x", d => xScale(d.x))
            .attr("y", d => yScale(d.y))
            .text(d => d.operation);

        this.highlightRegion
            .selectAll("path")
            .data(highlightRegionData)
            .join("path")
            .attr("stroke", "#4e79a7")
            .attr("stroke-linecap", "round")
            .attr("d", d => `M ${xScale(d.x)} ${yScale(d.y)} h 0`);

        this.highlightOperation
            .selectAll("path")
            .data(highlightOperationData)
            .join("path")
            .attr("stroke", "#e15759")
            .attr("stroke-linecap", "round")
            .attr("d", d => `M ${xScale(d.x)} ${yScale(d.y)} h 0`);
        this.highlightOperation
            .selectAll("text")
            .data(highlightOperationData)
            .join("text")
            .attr("color", "black")
            .attr("stroke-width", 0)
            .attr("font-weight", "600")
            .attr("dx", "0.5em")
            .attr("dy", "0.5em")
            .attr("x", d => xScale(d.x))
            .attr("y", d => yScale(d.y))
            .text(d => d.operation);

        this.svg
            .call(zoom)
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);

        this.button.onclick = () => {
            this.svg
                .transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }

    }

    constructor(options: VisualConstructorOptions) {

        this.target = options.element;

        this.button = document.createElement("button");
        this.button.innerHTML = "Re-center";
        this.button.style.position = "absolute";
        this.button.style.top = "15px";
        this.button.style.left = "10%";
        this.target.appendChild(this.button);

        this.regionSelect = this.appendDropdown("Region: ", "0px", "25%", "regionSelect");
        this.operationSelect = this.appendDropdown("Operation: ", "30px", "25%", "operationSelect");
        this.xSelect = this.appendDropdown("X: ", "0px", "60%", "xSelect");
        this.ySelect = this.appendDropdown("Y: ", "30px", "60%", "ySelect");

        this.svg = d3.select(options.element)
            .append("svg")
            .classed("svg", true);
        this.chart = this.svg
            .append("g")
            .classed("chart", true);
        this.highlightRegion = this.svg
            .append("g")
            .classed("highlightRegion", true);
        this.highlightOperation = this.svg
            .append("g")
            .classed("highlightOperation", true);
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

        this.drawChart(options);

        this.regionSelect.onchange = () => {

            this.drawChart(options);

        }

        this.operationSelect.onchange = () => {

            this.drawChart(options);

        }

        this.xSelect.onchange = () => {

            this.drawChart(options);

        }

        this.ySelect.onchange = () => {

            this.drawChart(options);

        }

    }

}