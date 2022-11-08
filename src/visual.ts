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

export class Visual implements IVisual {

    private target: HTMLElement;
    private button: HTMLElement;
    private regionSelect: HTMLSelectElement;
    private operationSelect: HTMLSelectElement;
    private xSelect: HTMLSelectElement;
    private ySelect: HTMLSelectElement;
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
    private chartHighlightRegion: Selection<SVGElement>;
    private chartHighlightOperation: Selection<SVGElement>;
    private labelHighlightOperation: Selection<SVGElement>;
    private tooltip: d3.Selection<HTMLElement, unknown, null, undefined>;

    private appendDropdown(selectPositionLeft: number, selectId: string) {

        let select = document.createElement("select");
        let label = document.createElement("label")


        select.style.left = `${selectPositionLeft}px`;
        select.className = "select";
        select.id = selectId;
        label.style.left = `${selectPositionLeft + 8}px`;
        label.className = "label";
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
        this.target.appendChild(select);
        this.target.appendChild(label);

        return select;

    }

    private readData(options: VisualUpdateOptions) {

        let dataViews = options.dataViews;
        let columnNames: string[] = [];
        let columns = {};

        for (let i = 0; i < dataViews[0].table.columns.length; i++) {

            columnNames.push(dataViews[0].table.columns[i].displayName);
            columns[columnNames[i]] = [];

        }

        for (let i = 0; i < dataViews[0].table.rows.length; i++) {

            let row = dataViews[0].table.rows[i];

            for (let i = 0; i < columnNames.length; i++) {
                columns[columnNames[i]].push(row[i]);
            }

        }

        return aq.table(columns);

    }

    private addDropdownOptions(dt: ColumnTable, element: HTMLSelectElement) {

        let optionValue = element.value;

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }

        switch (element) {

            case this.regionSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "- Region to highlight -";
                element.add(option);

                let regions = dt
                    .select("Region")
                    .dedupe()
                    .orderby("Region")
                    .array("Region");

                for (let i = 0; i < regions.length; i++) {

                    let option = document.createElement("option");
                    option.value = regions[i].valueOf() as string;
                    option.text = regions[i].valueOf() as string;
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            case this.operationSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "- Operation to highlight -";
                element.add(option);

                let operations = dt
                    .select("Operation")
                    .dedupe()
                    .orderby("Operation")
                    .array("Operation");

                for (let i = 0; i < operations.length; i++) {

                    let option = document.createElement("option");
                    option.value = operations[i].valueOf() as string;
                    option.text = operations[i].valueOf() as string;
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            case this.xSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "- Measure for X axis -";
                element.add(option);

                let displayNames = dt
                    .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));

                displayNames.sort(d3.ascending);
                for (let i = 0; i < displayNames.length; i++) {

                    let option = document.createElement("option");
                    option.value = displayNames[i];
                    option.text = displayNames[i].substring(7);
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            case this.ySelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "- Measure for Y axis -";
                element.add(option);

                let displayNames = dt
                    .columnNames(d => !["Fiscal Year", "Region", "Operation", "Filter Year 1", "Filter Year 2"].includes(d));

                displayNames.sort(d3.ascending);
                for (let i = 0; i < displayNames.length; i++) {

                    let option = document.createElement("option");
                    option.value = displayNames[i];
                    option.text = displayNames[i].substring(7);
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

        }

    }

    private transformData(dt: ColumnTable) {

        let d3Data;
        let linReg;

        if (!dt.columnNames().includes("Filter Year 1")) {

            d3Data = dt
                .derive({ x: aq.escape(d => d[this.xSelect.value]), y: aq.escape(d => d[this.ySelect.value]) })
                .select("Region", "Operation", "x", "y")
                .rename(aq.names("region", "operation", "x", "y") as Select)
                .impute({ x: () => 0, y: () => 0 })
                .derive({ regression: d => [d.x, d.y] });

            linReg = linearRegressionLine(linearRegression(d3Data.array("regression")));

            d3Data = d3Data
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
                .select("region", "operation", "x", "y", "yhat", "lower", "upper", "lower2", "upper2")
                .orderby("x");

        } else if (dt.get("Filter Year 1", 0) == dt.get("Filter Year 2", 0)) {

            d3Data = dt
                .filter(d => d["Fiscal Year"] == d["Filter Year 1"])
                .derive({ x: aq.escape(d => d[this.xSelect.value]), y: aq.escape(d => d[this.ySelect.value]) })
                .select("Region", "Operation", "x", "y")
                .rename(aq.names("region", "operation", "x", "y") as Select)
                .impute({ x: () => 0, y: () => 0 })
                .derive({ regression: d => [d.x, d.y] });

            linReg = linearRegressionLine(linearRegression(d3Data.array("regression")));

            d3Data = d3Data
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
                .select("region", "operation", "x", "y", "yhat", "lower", "upper", "lower2", "upper2")
                .orderby("x");

        } else {

            d3Data = dt
                .filter(d => d["Fiscal Year"] == d["Filter Year 1"] || d["Fiscal Year"] == d["Filter Year 2"])
                .derive({ x: aq.escape(d => d[this.xSelect.value]), y: aq.escape(d => d[this.ySelect.value]) })
                .select("Fiscal Year", "Region", "Operation", "x", "y")
                .rename(aq.names("year", "region", "operation", "x", "y") as Select)
                .groupby("region", "operation")
                .pivot("year", ["x", "y"])
                .rename(aq.names("region", "operation", "xOld", "xNew", "yOld", "yNew") as Select)
                .impute({ xOld: () => 0, xNew: () => 0, yOld: () => 0, yNew: () => 0 })
                .derive({
                    x: d => d.xNew - d.xOld,
                    y: d => d.yNew - d.yOld
                })
                .derive({ regression: d => [d.x, d.y] });

            linReg = linearRegressionLine(linearRegression(d3Data.array("regression")));

            d3Data = d3Data
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
                .select("region", "operation", "x", "y", "yhat", "lower", "upper", "lower2", "upper2")
                .orderby("x");

        }

        return d3Data;

    }

    private drawChart(options: VisualUpdateOptions) {

        let dt = this.readData(options);

        this.addDropdownOptions(dt, this.regionSelect);
        this.addDropdownOptions(dt, this.operationSelect);
        this.addDropdownOptions(dt, this.xSelect);
        this.addDropdownOptions(dt, this.ySelect);

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

        let data = this.transformData(dt);
        let indices = d3.range(0, data.numRows());
        let dataRegion = data.getter("region");
        let dataOperation = data.getter("operation");
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
            xLabel = this.xSelect.selectedOptions[0].label;
        }
        let yLabel: string;
        if (this.ySelect.value == "") {
            yLabel = "";
        } else {
            yLabel = this.ySelect.selectedOptions[0].label;
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
            let pointerEntered = (d) => {

                this.tooltip
                    .append("div")
                    .append("b")
                    .text(`${dataOperation(d)}`);
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
            let pointerMoved = (d) => {

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
                .attr("d", area(indices))
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
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
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
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
                .on("pointerleave", () => pointerLeft());

            this.chartOutlier
                .selectAll("path")
                .data(indicesChartOutlier)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightRegion
                .selectAll("path")
                .data(indicesHighlightRegion)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
                .on("pointerleave", () => pointerLeft());

            this.chartHighlightOperation
                .selectAll("path")
                .data(indicesHighlightOperation)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 9 / transform.k)
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
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
                .on("pointerenter", (event, d) => pointerEntered(d))
                .on("pointermove", (event, d) => pointerMoved(d))
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

        this.target = options.element;

        this.button = document.createElement("button");
        this.button.className = "button";
        this.button.innerHTML = "Re-center";
        this.target.appendChild(this.button);

        this.regionSelect = this.appendDropdown(110, "regionSelect");
        this.operationSelect = this.appendDropdown(342, "operationSelect");
        this.xSelect = this.appendDropdown(575, "xSelect");
        this.ySelect = this.appendDropdown(808, "ySelect");

        this.cardCenter = document.createElement("div");
        this.cardCenter.className = "cardCenter";
        this.target.appendChild(this.cardCenter);

        this.svg = d3.select(this.cardCenter)
            .append("svg")
            .classed("svg", true);
        this.grid = this.svg
            .append("g")
            .classed("grid", true);
        this.regressionArea = this.svg
            .append("g")
            .append("path")
            .classed("regressionArea", true);
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
        this.chartHighlightRegion = this.svg
            .append("g")
            .classed("chartHighlightRegion", true);
        this.chartHighlightOperation = this.svg
            .append("g")
            .classed("chartHighlightOperation", true);
        this.labelHighlightOperation = this.svg
            .append("g")
            .classed("labelHighlightOperation", true);
        this.tooltip = d3.select(this.cardCenter)
            .append("div")
            .classed("tooltip", true);

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