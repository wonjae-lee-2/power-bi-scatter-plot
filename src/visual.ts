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
import ColumnTable from "arquero/dist/types/table/column-table";
import { Select } from "arquero/dist/types/table/transformable";

import { linearRegression, linearRegressionLine } from "simple-statistics";

interface dataModel {
    operations: ColumnTable;
    regions: ColumnTable;
    global: ColumnTable;
}

export class Visual implements IVisual {

    private button: HTMLElement;
    private regionSelect: HTMLSelectElement;
    private operationSelect: HTMLSelectElement;
    private xSelect: HTMLSelectElement;
    private ySelect: HTMLSelectElement;
    private settingsSymbol: HTMLDivElement;
    private settingsList: HTMLDivElement;
    private settingsListClose: HTMLDivElement;
    private CheckboxLinearRegression: HTMLInputElement;
    private CheckboxGlobalAverage: HTMLInputElement;
    private CheckboxRegionalAverages: HTMLInputElement;
    private cardCenter: HTMLDivElement;

    private svg: Selection<any>;
    private grid: Selection<SVGElement>;
    private regressionArea: Selection<SVGElement>;
    private regressionLine: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private chartArea: Selection<SVGElement>;
    private chart: Selection<SVGElement>;
    private label: Selection<SVGElement>;
    private chartOutlier: Selection<SVGElement>;
    private chartGlobalAverage: Selection<SVGElement>;
    private labelGlobalAverage: Selection<SVGElement>;
    private chartRegionalAverages: Selection<SVGElement>;
    private labelRegionalAverages: Selection<SVGElement>;
    private chartHighlightRegion: Selection<SVGElement>;
    private labelHighlightRegion: Selection<SVGElement>;
    private chartHighlightOperation: Selection<SVGElement>;
    private labelHighlightOperation: Selection<SVGElement>;
    private tooltip: d3.Selection<HTMLElement, unknown, null, undefined>;

    private drawChart(dataModel: dataModel) {

        let width = this.cardCenter.offsetWidth //options.viewport.width;
        let height = this.cardCenter.offsetHeight //options.viewport.height;
        let marginLeft = 50;
        let marginRight = 40;
        let marginTop = 30;
        let marginBottom = 30;
        let paddingLeft = 20;
        let paddingRight = 20;
        let paddingTop = 20;
        let paddingBottom = 20;
        let xRange = [marginLeft + paddingLeft, width - marginRight - paddingRight];
        let yRange = [height - marginBottom - paddingBottom, marginTop + paddingTop];

        let data = dataModel.operations;
        let indices = d3.range(0, data.numRows());
        let dataRegion = data.getter("Region");
        let dataOperation = data.getter("Operation");
        let dataX = data.getter("x");
        let dataY = data.getter("y");
        let dataYhat = data.getter("yhat");
        let dataLower = data.getter("lower");
        let dataUpper = data.getter("upper");
        let dataLower2 = data.getter("lower2");
        let dataUpper2 = data.getter("upper2");
        let indicesRegression = [0, data.numRows() - 1];
        let indicesChartOutlier = d3.filter(indices, d => dataY(d) < dataLower2(d) || dataUpper2(d) < dataY(d));
        let indicesHighlightRegion = d3.filter(indices, d => dataRegion(d) == this.regionSelect.value);
        let indicesHighlightOperation = d3.filter(indices, d => dataOperation(d) == this.operationSelect.value);

        let dataRegionalAverages = dataModel.regions;
        let indicesRegionalAverages = d3.range(0, dataRegionalAverages.numRows());
        let dataRegionalAveragesRegion = dataRegionalAverages.getter("Region");
        let dataRegionalAveragesX = dataRegionalAverages.getter("x");
        let dataRegionalAveragesY = dataRegionalAverages.getter("y");

        let dataGlobalAverage = dataModel.global;
        let indicesGlobalAverage = d3.range(0, dataGlobalAverage.numRows());
        let dataGlobalAverageRegion = dataGlobalAverage.getter("Region");
        let dataGlobalAverageX = dataGlobalAverage.getter("x");
        let dataGlobalAverageY = dataGlobalAverage.getter("y");

        let [domains] = data
            .rollup({
                x: d => [aq.op.min(d.x), aq.op.max(d.x)],
                y: d => [aq.op.min(d.y), aq.op.max(d.y)]
            });
        let xScale;
        if (domains["x"][0] == 0 && domains["x"][1] == 0) {
            xScale = d3.scaleLinear([-1, 1], xRange);
        } else {
            xScale = d3.scaleLinear(domains["x"], xRange);
        }
        let yScale;
        if (domains["y"][0] == 0 && domains["y"][1] == 0) {
            yScale = d3.scaleLinear([-1, 1], yRange);
        } else {
            yScale = d3.scaleLinear(
                [
                    d3.min([domains["y"][0], aq.agg(data, aq.op.min("lower"))]),
                    d3.max([domains["y"][1], aq.agg(data, aq.op.max("upper"))])
                ],
                yRange
            );
        }
        let xLabel: string;
        if (this.xSelect.value == "") {
            xLabel = "";
        } else {
            xLabel = this.xSelect.value;
        }
        let yLabel: string;
        if (this.ySelect.value == "") {
            yLabel = "";
        } else {
            yLabel = this.ySelect.value;
        }

        let xAxisFunction = (xScale) => d3.axisBottom(xScale).ticks(7, "~s");
        let yAxisFunction = (yScale) => d3.axisLeft(yScale).ticks(5, "~s");
        let xGrid = (g, xScale) => g
            .selectAll(".xGrid")
            .data(xScale.ticks(7))
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

        let zoom = d3.zoom().scaleExtent([0, Infinity]).on("zoom", (event) => {

            let transform = event.transform;
            let xScaleZoomed = transform.rescaleX(xScale);
            let yScaleZoomed = transform.rescaleY(yScale);

            let area = d3.area<number>()
                .curve(d3.curveLinear)
                .x(d => xScale(dataX(d)))
                .y0(d => yScale(dataLower(d)))
                .y1(d => yScale(dataUpper(d)))

            let formatNumber = d3.format(",.2f")
            let pointerEntered = (d, dataText, dataX, dataY) => {

                this.tooltip
                    .append("div")
                    .append("b")
                    .text(`${dataText(d)}`);
                if (dataX(d) !== 0) {
                    this.tooltip
                        .append("div")
                        .text(`${xLabel}: ${formatNumber(dataX(d))}`);
                }
                if (dataY(d) !== 0) {
                    this.tooltip
                        .append("div")
                        .text(`${yLabel}: ${formatNumber(dataY(d))}`);
                }
                this.tooltip.style("visibility", "visible");

            }
            let pointerMoved = (d, dataX, dataY) => {

                let tooltipWidth = this.tooltip.property("offsetWidth");
                let tooltipHeight = this.tooltip.property("offsetHeight");
                if (xScaleZoomed(dataX(d)) - (tooltipWidth / 2) < 0) {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d))}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2)}px`);
                } else if (xScaleZoomed(dataX(d)) + (tooltipWidth / 2) > width) {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d)) - tooltipWidth}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2)}px`);
                } else {
                    this.tooltip
                        .style("left", `${xScaleZoomed(dataX(d)) - (tooltipWidth / 2)}px`)
                        .style("top", `${yScaleZoomed(dataY(d)) - (tooltipHeight * 1.2)}px`);
                }

            }
            let pointerLeft = () => {

                this.tooltip.style("visibility", "hidden");
                this.tooltip
                    .selectChildren()
                    .remove();

            }

            this.grid
                .call(xGrid, xScaleZoomed)
                .call(yGrid, yScaleZoomed);

            this.regressionArea
                .attr("d", area(indicesRegression))
                .attr("transform", transform);

            this.regressionLine
                .selectAll("line")
                .data([indicesRegression])
                .join("line")
                .attr("x1", d => xScale(dataX(d[0])))
                .attr("x2", d => xScale(dataX(d[1])))
                .attr("y1", d => yScale(dataYhat(d[0])))
                .attr("y2", d => yScale(dataYhat(d[1])))
                .attr("transform", transform)
                .attr("stroke-width", 2 / transform.k);

            this.xAxis
                .attr("transform", `translate(0, ${height - marginBottom})`)
                .call(xAxisFunction(xScaleZoomed))
                .call(g => g.selectAll(".domain, .xLabel").remove())
                .call(g => g.append("text")
                    .attr("x", width - (marginRight / 4))
                    .attr("y", -marginBottom / 4)
                    .text(xLabel)
                    .classed("xLabel", true)
                );

            this.yAxis
                .attr("transform", `translate(${marginLeft}, 0)`)
                .call(yAxisFunction(yScaleZoomed))
                .call(g => g.selectAll(".domain, .yLabel").remove())
                .call(g => g.append("text")
                    .attr("x", -marginLeft * (3 / 4))
                    .attr("y", marginTop / 2)
                    .text(yLabel)
                    .classed("yLabel", true)
                );

            this.chart
                .selectAll("path")
                .data(indices)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 6 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.label
                .selectAll("text")
                .data(indices)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartOutlier
                .selectAll("path")
                .data(indicesChartOutlier)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartRegionalAverages
                .selectAll("path")
                .data(indicesRegionalAverages)
                .join("path")
                .attr("d", d => `M ${xScale(dataRegionalAveragesX(d))} ${yScale(dataRegionalAveragesY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataRegionalAveragesRegion, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointermove", (event, d) => pointerMoved(d, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointerleave", () => pointerLeft());

            this.labelRegionalAverages
                .selectAll("text")
                .data(indicesRegionalAverages)
                .join("text")
                .text(d => dataRegionalAveragesRegion(d))
                .attr("x", d => xScale(dataRegionalAveragesX(d)))
                .attr("y", d => yScale(dataRegionalAveragesY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataRegionalAveragesRegion, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointermove", (event, d) => pointerMoved(d, dataRegionalAveragesX, dataRegionalAveragesY))
                .on("pointerleave", () => pointerLeft());

            this.chartGlobalAverage
                .selectAll("path")
                .data(indicesGlobalAverage)
                .join("path")
                .attr("d", d => `M ${xScale(dataGlobalAverageX(d))} ${yScale(dataGlobalAverageY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataGlobalAverageRegion, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointermove", (event, d) => pointerMoved(d, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointerleave", () => pointerLeft());

            this.labelGlobalAverage
                .selectAll("text")
                .data(indicesGlobalAverage)
                .join("text")
                .text(d => dataGlobalAverageRegion(d))
                .attr("x", d => xScale(dataGlobalAverageX(d)))
                .attr("y", d => yScale(dataGlobalAverageY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataGlobalAverageRegion, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointermove", (event, d) => pointerMoved(d, dataGlobalAverageX, dataGlobalAverageY))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightRegion
                .selectAll("path")
                .data(indicesHighlightRegion)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.labelHighlightRegion
                .selectAll("text")
                .data(indicesHighlightRegion)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightOperation
                .selectAll("path")
                .data(indicesHighlightOperation)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

            this.labelHighlightOperation
                .selectAll("text")
                .data(indicesHighlightOperation)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.4em")
                .attr("transform", transform)
                .attr("font-size", 12 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d, dataOperation, dataX, dataY))
                .on("pointermove", (event, d) => pointerMoved(d, dataX, dataY))
                .on("pointerleave", () => pointerLeft());

        });

        this.svg.
            attr("viewBox", [0, 0, width, height]);

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

        function appendDropdown(target: HTMLElement, selectPositionLeft: number, selectId: string): HTMLSelectElement {

            let container = document.createElement("div");
            let label = document.createElement("label");
            let select = document.createElement("select");

            container.style.left = `${selectPositionLeft}px`;
            container.className = "dropdownContainer";
            label.className = "dropdownLabel";
            label.htmlFor = selectId;
            select.className = "dropdownSelect";
            select.id = selectId;
            switch (selectId) {
                case "regionSelect":
                    label.textContent = "Region"
                    break;
                case "operationSelect":
                    label.textContent = "Operation"
                    break;
                case "xSelect":
                    label.textContent = "X Axis"
                    break;
                case "ySelect":
                    label.textContent = "Y Axis"
                    break;
            }

            container.appendChild(select);
            container.appendChild(label);
            target.appendChild(container);

            return select;

        }

        function appendCheckbox(list: HTMLDivElement, checkboxId: string, labelText: string): HTMLInputElement {

            let settingsListItem = document.createElement("div");
            let checkbox = document.createElement("input");
            let label = document.createElement("label");

            checkbox.type = "checkbox";
            checkbox.id = checkboxId;
            label.htmlFor = checkboxId;
            label.textContent = ` ${labelText}`;
            settingsListItem.className = "settingsListItem";
            settingsListItem.appendChild(checkbox);
            settingsListItem.appendChild(label);
            list.appendChild(settingsListItem);

            return checkbox;

        }

        let target = options.element;

        this.button = document.createElement("button");
        this.button.className = "button";
        this.button.innerHTML = "Re-center";
        target.appendChild(this.button);

        this.regionSelect = appendDropdown(target, 106, "regionSelect");
        this.operationSelect = appendDropdown(target, 330, "operationSelect");
        this.xSelect = appendDropdown(target, 554, "xSelect");
        this.ySelect = appendDropdown(target, 778, "ySelect");

        this.settingsSymbol = document.createElement("div");
        this.settingsSymbol.className = "settingsSymbol";
        this.settingsSymbol.innerHTML = "&#8230;";
        target.appendChild(this.settingsSymbol);

        this.cardCenter = document.createElement("div");
        this.cardCenter.className = "cardCenter";
        target.appendChild(this.cardCenter);

        this.svg = d3.select(this.cardCenter)
            .append("svg")
            .classed("svg", true);
        this.grid = this.svg
            .append("g")
            .classed("grid", true);
        this.regressionArea = this.svg
            .append("g")
            .classed("regressionArea", true)
            .append("path");
        this.regressionLine = this.svg
            .append("g")
            .classed("regressionLine", true);
        this.xAxis = this.svg
            .append("g")
            .classed("xAxis", true);
        this.yAxis = this.svg
            .append("g")
            .classed("yAxis", true);
        this.chartArea = this.svg
            .append("g")
            .classed("chartArea", true);
        this.chart = this.chartArea
            .append("g")
            .classed("chart", true);
        this.label = this.chartArea
            .append("g")
            .classed("label", true);
        this.chartOutlier = this.svg
            .append("g")
            .classed("chartOutlier", true);
        this.chartGlobalAverage = this.svg
            .append("g")
            .classed("chartGlobalAverage", true);
        this.labelGlobalAverage = this.svg
            .append("g")
            .classed("labelGlobalAverage", true);
        this.chartRegionalAverages = this.svg
            .append("g")
            .classed("chartRegionalAverages", true);
        this.labelRegionalAverages = this.svg
            .append("g")
            .classed("labelRegionalAverages", true);
        this.chartHighlightRegion = this.svg
            .append("g")
            .classed("chartHighlightRegion", true);
        this.labelHighlightRegion = this.svg
            .append("g")
            .classed("labelHighlightRegion", true);
        this.chartHighlightOperation = this.svg
            .append("g")
            .classed("chartHighlightOperation", true);
        this.labelHighlightOperation = this.svg
            .append("g")
            .classed("labelHighlightOperation", true);
        this.tooltip = d3.select(this.cardCenter)
            .append("div")
            .classed("tooltip", true);

        this.settingsList = document.createElement("div");
        this.settingsList.className = "settingsList";

        let settingsListTitle = document.createElement("div");
        settingsListTitle.className = "settingsListItem settingsListTitle";
        settingsListTitle.textContent = "Choose features to show";

        this.settingsListClose = document.createElement("div");
        this.settingsListClose.className = "settingsListItem settingsListClose";
        this.settingsListClose.innerHTML = "&#10006;";

        let settingsListLine = document.createElement("hr");

        this.settingsList.appendChild(settingsListTitle);
        this.settingsList.appendChild(this.settingsListClose);
        this.settingsList.appendChild(settingsListLine);
        this.CheckboxLinearRegression = appendCheckbox(this.settingsList, "linearRegression", "Linear regression");
        this.CheckboxGlobalAverage = appendCheckbox(this.settingsList, "globalAverage", "Global average");
        this.CheckboxRegionalAverages = appendCheckbox(this.settingsList, "regionalAverages", "Regional averages");
        target.appendChild(this.settingsList);

    }

    public update(options: VisualUpdateOptions) {

        function readData(options: VisualUpdateOptions): ColumnTable {

            let dataViews = options.dataViews;
            let columnNames: string[] = [];
            let columns: { [index: string]: (string | number)[] } = {};

            for (let i = 0; i < dataViews[0].table.columns.length; i++) {
                if (dataViews[0].table.columns[i].displayName.substring(0, 3) == "Sum") {
                    columnNames.push(dataViews[0].table.columns[i].displayName.substring(7));
                    columns[columnNames[i]] = [];
                } else {
                    columnNames.push(dataViews[0].table.columns[i].displayName);
                    columns[columnNames[i]] = [];
                }
            }

            for (let i = 0; i < dataViews[0].table.rows.length; i++) {
                let row = dataViews[0].table.rows[i];
                for (let i = 0; i < columnNames.length; i++) {
                    let rowItem = row[i];
                    if (typeof rowItem === "number" || typeof rowItem === "string") {
                        columns[columnNames[i]].push(rowItem);
                    } else if (columnNames[i].substring(0, 5) == "Ratio") {
                        columns[columnNames[i]].push(null);
                    } else {
                        columns[columnNames[i]].push(0);
                    }
                }
            }

            return aq.table(columns);

        }

        function updateDropdownOptions(dt: ColumnTable, element: HTMLSelectElement) {

            function convertToOptions(array: string[]) {
                for (let i = 0; i < array.length; i++) {
                    let option = document.createElement("option");
                    option.value = array[i];
                    option.text = option.value;
                    element.add(option);
                    if (option.value == optionValue) {
                        element.value = option.value;
                    }
                }
            }

            let optionValue = element.value;

            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }

            switch (element.id) {

                case "regionSelect": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Region to highlight -";
                    element.add(option);

                    let regions: string[] = dt
                        .select("Region")
                        .dedupe()
                        .orderby("Region")
                        .array("Region");

                    convertToOptions(regions);

                    break;

                }

                case "operationSelect": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Operation to highlight -";
                    element.add(option);

                    let operations: string[] = dt
                        .select("Operation")
                        .dedupe()
                        .orderby("Operation")
                        .array("Operation");

                    convertToOptions(operations);

                    break;

                }

                case "xSelect": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Measure for X axis -";
                    element.add(option);

                    let displayNames = dt
                        .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));
                    displayNames.sort(d3.ascending);

                    convertToOptions(displayNames);

                    break;

                }

                case "ySelect": {

                    let option = document.createElement("option");
                    option.value = "";
                    option.text = "- Measure for Y axis -";
                    element.add(option);

                    let displayNames = dt
                        .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));
                    displayNames.sort(d3.ascending);

                    convertToOptions(displayNames);

                    break;

                }

            }

        }

        function transformData(dt: ColumnTable, xValue: string, yValue: string): dataModel {

            function getOperationData(dt: ColumnTable): ColumnTable {

                let linReg = linearRegressionLine(linearRegression(dt.array("regression")));

                dt = dt
                    .derive({ yhat: aq.escape(d => linReg(d.x)) })
                    .derive({ resid: d => d.y - d.yhat })
                    .derive({
                        lower: d => d.yhat - aq.op.stdevp(d.resid),
                        upper: d => d.yhat + aq.op.stdevp(d.resid)
                    })
                    .derive({
                        lower2: d => d.yhat - (2 * aq.op.stdevp(d.resid)),
                        upper2: d => d.yhat + (2 * aq.op.stdevp(d.resid))
                    })
                    .select("Region", "Operation", "x", "y", "yhat", "lower", "upper", "lower2", "upper2")
                    .orderby("x")
                    .reify();

                return dt;

            }

            function getRegionalAverages(dt: ColumnTable, xValue: string, yValue: string): ColumnTable {

                let xMeasures: string[];
                let yMeasures: string[];
                let xRegions: ColumnTable;
                let yRegions: ColumnTable;

                if (xValue.substring(0, 5) == "Ratio") {

                    xMeasures = xValue.substring(6).split("_vs_");
                    xRegions = dt
                        .derive({ xNumerator: aq.escape(d => d[xMeasures[0]]), xDenominator: aq.escape(d => d[xMeasures[1]]) })
                        .select("Region", "xNumerator", "xDenominator")
                        .groupby("Region")
                        .rollup({ x: d => aq.op.sum(d.xNumerator) / aq.op.sum(d.xDenominator) })
                        .reify();

                } else {

                    xRegions = dt
                        .derive({ x: aq.escape(d => d[xValue]) })
                        .select("Region", "x")
                        .groupby("Region")
                        .rollup({ x: aq.op.mean("x") })
                        .reify();

                }

                if (yValue.substring(0, 5) == "Ratio") {

                    yMeasures = yValue.substring(6).split("_vs_");
                    yRegions = dt
                        .derive({ yNumerator: aq.escape(d => d[yMeasures[0]]), yDenominator: aq.escape(d => d[yMeasures[1]]) })
                        .select("Region", "yNumerator", "yDenominator")
                        .groupby("Region")
                        .rollup({ y: d => aq.op.sum(d.yNumerator) / aq.op.sum(d.yDenominator) })
                        .reify();

                } else {

                    yRegions = dt
                        .derive({ y: aq.escape(d => d[yValue]) })
                        .select("Region", "y")
                        .groupby("Region")
                        .rollup({ y: aq.op.mean("y") })
                        .reify();

                }

                return xRegions.join(yRegions);

            }

            function getGlobalAverage(dt: ColumnTable, xValue: string, yValue: string): ColumnTable {

                let xMeasures: string[];
                let yMeasures: string[];
                let xGlobal: ColumnTable;
                let yGlobal: ColumnTable;

                if (xValue.substring(0, 5) == "Ratio") {

                    xMeasures = xValue.substring(6).split("_vs_");
                    xGlobal = dt
                        .derive({ xNumerator: aq.escape(d => d[xMeasures[0]]), xDenominator: aq.escape(d => d[xMeasures[1]]) })
                        .select("xNumerator", "xDenominator")
                        .rollup({ x: d => aq.op.sum(d.xNumerator) / aq.op.sum(d.xDenominator) })
                        .derive({ Region: () => "Global" })
                        .reify();

                } else {

                    xGlobal = dt
                        .derive({ x: aq.escape(d => d[xValue]) })
                        .select("x")
                        .rollup({ x: aq.op.mean("x") })
                        .derive({ Region: () => "Global" })
                        .reify();

                }

                if (yValue.substring(0, 5) == "Ratio") {

                    yMeasures = yValue.substring(6).split("_vs_");
                    yGlobal = dt
                        .derive({ yNumerator: aq.escape(d => d[yMeasures[0]]), yDenominator: aq.escape(d => d[yMeasures[1]]) })
                        .select("yNumerator", "yDenominator")
                        .rollup({ y: d => aq.op.sum(d.yNumerator) / aq.op.sum(d.yDenominator) })
                        .derive({ Region: () => "Global" })
                        .reify();

                } else {

                    yGlobal = dt
                        .derive({ y: aq.escape(d => d[yValue]) })
                        .select("y")
                        .rollup({ y: aq.op.mean("y") })
                        .derive({ Region: () => "Global" })
                        .reify();

                }

                return xGlobal.join(yGlobal);

            }

            let operations: ColumnTable;
            let regions: ColumnTable;
            let global: ColumnTable;

            if (!dt.columnNames().includes("Filter Year 1")) {

                operations = dt
                    .derive({ x: aq.escape(d => d[xValue]), y: aq.escape(d => d[yValue]) })
                    .select("Region", "Operation", "x", "y")
                    .filter(d => d.x != null && d.y != null)
                    .derive({ regression: d => [d.x, d.y] })
                    .reify();
                operations = getOperationData(operations);

                regions = getRegionalAverages(dt, xValue, yValue);
                global = getGlobalAverage(dt, xValue, yValue);

            } else if (dt.get("Filter Year 1", 0) == dt.get("Filter Year 2", 0)) {

                let dtFiltered: ColumnTable = dt
                    .filter(d => d["Fiscal Year"] == d["Filter Year 1"]);

                operations = dtFiltered
                    .derive({ x: aq.escape(d => d[xValue]), y: aq.escape(d => d[yValue]) })
                    .select("Region", "Operation", "x", "y")
                    .filter(d => d.x != null && d.y != null)
                    .derive({ regression: d => [d.x, d.y] })
                    .reify();
                operations = getOperationData(operations);

                regions = getRegionalAverages(dtFiltered, xValue, yValue);
                global = getGlobalAverage(dtFiltered, xValue, yValue);

            } else {

                operations = dt
                    .filter(d => d["Fiscal Year"] == d["Filter Year 1"] || d["Fiscal Year"] == d["Filter Year 2"])
                    .derive({ x: aq.escape(d => d[xValue]), y: aq.escape(d => d[yValue]) })
                    .select("Fiscal Year", "Region", "Operation", "x", "y")
                    .groupby("Region", "Operation")
                    .pivot("Fiscal Year", ["x", "y"])
                    .rename(aq.names("Region", "Operation", "xOld", "xNew", "yOld", "yNew") as Select)
                    .filter(d => d.xOld != null && d.xNew != null && d.yOld != null && d.yNew != null)
                    .derive({
                        x: d => d.xNew - d.xOld,
                        y: d => d.yNew - d.yOld
                    })
                    .derive({ regression: d => [d.x, d.y] });
                operations = getOperationData(operations);

                let dtFilteredOld: ColumnTable;
                let dtFilteredNew: ColumnTable;

                if (dt.get("Filter Year 1", 0) < dt.get("Filter Year 2", 0)) {
                    dtFilteredOld = dt.filter(d => d["Fiscal Year"] == d["Filter Year 1"]);
                    dtFilteredNew = dt.filter(d => d["Fiscal Year"] == d["Filter Year 2"]);
                } else {
                    dtFilteredOld = dt.filter(d => d["Fiscal Year"] == d["Filter Year 2"]);
                    dtFilteredNew = dt.filter(d => d["Fiscal Year"] == d["Filter Year 1"]);
                }

                let regionsOld = getRegionalAverages(dtFilteredOld, xValue, yValue)
                    .rename({ x: "xOld", y: "yOld" });
                let regionsNew = getRegionalAverages(dtFilteredNew, xValue, yValue)
                    .rename({ x: "xNew", y: "yNew" });
                regions = regionsOld
                    .join(regionsNew)
                    .derive({ x: d => d.xNew - d.xOld, y: d => d.yNew - d.yOld })
                    .select("Region", "x", "y")
                    .reify();

                let globalOld = getGlobalAverage(dtFilteredOld, xValue, yValue)
                    .rename({ x: "xOld", y: "yOld" });
                let globalNew = getGlobalAverage(dtFilteredNew, xValue, yValue)
                    .rename({ x: "xNew", y: "yNew" });
                global = globalOld
                    .join(globalNew)
                    .derive({ x: d => d.xNew - d.xOld, y: d => d.yNew - d.yOld })
                    .select("Region", "x", "y")
                    .reify();

            }

            return {
                "operations": operations,
                "regions": regions,
                "global": global
            };

        }

        let dt = readData(options);

        updateDropdownOptions(dt, this.regionSelect);
        updateDropdownOptions(dt, this.operationSelect);
        updateDropdownOptions(dt, this.xSelect);
        updateDropdownOptions(dt, this.ySelect);

        this.regionSelect.onchange = () => {
            let dataModel = transformData(dt, this.xSelect.value, this.ySelect.value);
            this.drawChart(dataModel);
        }

        this.operationSelect.onchange = () => {
            let dataModel = transformData(dt, this.xSelect.value, this.ySelect.value);
            this.drawChart(dataModel);
        }

        this.xSelect.onchange = () => {
            let dataModel = transformData(dt, this.xSelect.value, this.ySelect.value);
            updateDropdownOptions(dataModel.operations, this.regionSelect);
            updateDropdownOptions(dataModel.operations, this.operationSelect);
            this.drawChart(dataModel);
        }

        this.ySelect.onchange = () => {
            let dataModel = transformData(dt, this.xSelect.value, this.ySelect.value);
            updateDropdownOptions(dataModel.operations, this.regionSelect);
            updateDropdownOptions(dataModel.operations, this.operationSelect);
            this.drawChart(dataModel);
        }

        this.settingsSymbol.onclick = () => {
            this.settingsList.style.visibility = "visible";
        }

        this.settingsListClose.onclick = () => {
            this.settingsList.style.visibility = "hidden";
        }

        this.CheckboxLinearRegression.onchange = () => {

            if (this.CheckboxLinearRegression.checked) {
                this.regressionArea.attr("visibility", "visible");
                this.regressionLine.selectAll("line").attr("visibility", "visible");
            } else {
                this.regressionArea.attr("visibility", "hidden");
                this.regressionLine.selectAll("line").attr("visibility", "hidden");
            }

        }

        this.CheckboxGlobalAverage.onchange = () => {

            if (this.CheckboxGlobalAverage.checked) {
                this.chartGlobalAverage.selectAll("path").attr("visibility", "visible");
                this.labelGlobalAverage.selectAll("text").attr("visibility", "visible");
            } else {
                this.chartGlobalAverage.selectAll("path").attr("visibility", "hidden");
                this.labelGlobalAverage.selectAll("text").attr("visibility", "hidden");
            }

        }

        this.CheckboxRegionalAverages.onchange = () => {

            if (this.CheckboxRegionalAverages.checked) {
                this.chartRegionalAverages.selectAll("path").attr("visibility", "visible");
                this.labelRegionalAverages.selectAll("text").attr("visibility", "visible");
            } else {
                this.chartRegionalAverages.selectAll("path").attr("visibility", "hidden");
                this.labelRegionalAverages.selectAll("text").attr("visibility", "hidden");
            }

        }

        let dataModel = transformData(dt, this.xSelect.value, this.ySelect.value);
        updateDropdownOptions(dataModel.operations, this.regionSelect);
        updateDropdownOptions(dataModel.operations, this.operationSelect);
        this.drawChart(dataModel);

    }

}