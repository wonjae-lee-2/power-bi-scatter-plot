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

    private svg: Selection<any>;
    private grid: Selection<SVGElement>;
    private regressionArea: Selection<SVGElement>;
    private regressionLine: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis: Selection<SVGElement>;
    private chart: Selection<SVGElement>;
    private label: Selection<SVGElement>;
    private chartHighlightRegion: Selection<SVGElement>;
    private chartHighlightOperation: Selection<SVGElement>;
    private labelHighlightOperation: Selection<SVGElement>;

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

    private addDropdownOptions(options: VisualUpdateOptions, element: HTMLSelectElement) {

        let optionValue = element.value;
        let dataViews = options.dataViews;

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }

        switch (element) {

            case this.regionSelect: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "--Select a region to highlight--";
                element.add(option);

                let regions = dataViews[0].categorical.categories[1].values;
                let regionsUniqueAsc = [...new Set(regions)].sort(d3.ascending);

                for (let i = 0; i < regionsUniqueAsc.length; i++) {

                    let option = document.createElement("option");
                    option.value = regionsUniqueAsc[i].valueOf() as string;
                    option.text = regionsUniqueAsc[i].valueOf() as string;
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
                option.text = "--Select an operation to highlight--";
                element.add(option);

                let operations = dataViews[0].categorical.categories[2].values;
                let operationsUniqueAsc = [...new Set(operations)].sort(d3.ascending);

                for (let i = 0; i < operationsUniqueAsc.length; i++) {

                    let option = document.createElement("option");
                    option.value = operationsUniqueAsc[i].valueOf() as string;
                    option.text = operationsUniqueAsc[i].valueOf() as string;
                    element.add(option);

                    if (option.value == optionValue) {
                        element.value = option.value;
                    }

                }

                break;

            }

            default: {

                let option = document.createElement("option");
                option.value = "";
                option.text = "--Select a measure to plot--";
                element.add(option);

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
                        element.value = option.value;
                    }

                }

                break;

            }

        }

    }

    private transformData(options: VisualUpdateOptions): ColumnTable {

        let dataViews = options.dataViews;
        let yearValues = dataViews[0].categorical.categories[0].values;
        let regionValues = dataViews[0].categorical.categories[1].values;
        let operationValues = dataViews[0].categorical.categories[2].values;
        let measures = dataViews[0].categorical.values;

        let xValues = [];
        let yValues = [];

        for (let i = 0; i < measures.length; i++) {

            if (measures[i].source.displayName == this.xSelect.value) {
                xValues = measures[i].values;
            }

            if (measures[i].source.displayName == this.ySelect.value) {
                yValues = measures[i].values;
            }

        }

        let yearValuesUnique = [...new Set(yearValues)];
        let dt: ColumnTable;

        if (yearValuesUnique.length == 1) {

            dt = aq.table({
                "region": regionValues,
                "operation": operationValues,
                "x": xValues,
                "y": yValues
            })
                .impute({ x: () => 0, y: () => 0 })
                .derive({ regression: d => [d.x, d.y] });

            let linReg = linearRegressionLine(linearRegression(dt.array("regression")));

            dt = dt
                .derive({ yhat: aq.escape(d => linReg(d.x)) })
                .derive({ resid: d => d.y - d.yhat })
                .derive({
                    lower: d => d.yhat - aq.op.stdevp(d.resid),
                    upper: d => d.yhat + aq.op.stdevp(d.resid)
                })
                .select("region", "operation", "x", "y", "yhat", "lower", "upper")
                .orderby("x");

        } else {

            dt = aq.table({
                "year": yearValues,
                "region": regionValues,
                "operation": operationValues,
                "x": xValues,
                "y": yValues
            })
                .filter(d => d.year == aq.op.min(d.year) || d.year == aq.op.max(d.year))
                .groupby("region", "operation")
                .pivot("year", ["x", "y"])
                .rename(aq.names("region", "operation", "xOld", "xNew", "yOld", "yNew") as Select)
                .impute({ xOld: () => 0, xNew: () => 0, yOld: () => 0, yNew: () => 0 })
                .derive({
                    x: d => d.xNew - d.xOld,
                    y: d => d.yNew - d.yOld
                })
                .derive({ regression: d => [d.x, d.y] });

            let linReg = linearRegressionLine(linearRegression(dt.array("regression")));

            dt = dt
                .derive({ yhat: aq.escape(d => linReg(d.x)) })
                .derive({ resid: d => d.y - d.yhat })
                .derive({
                    lower: d => d.yhat - aq.op.stdevp(d.resid),
                    upper: d => d.yhat + aq.op.stdevp(d.resid)
                })
                .select("region", "operation", "x", "y", "yhat", "lower", "upper")
                .orderby("x");

        }

        return dt;

    }

    private drawChart(options: VisualUpdateOptions) {

        this.addDropdownOptions(options, this.regionSelect);
        this.addDropdownOptions(options, this.operationSelect);
        this.addDropdownOptions(options, this.xSelect);
        this.addDropdownOptions(options, this.ySelect);

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let marginLeft = 40;
        let marginRight = 40;
        let marginTop = 120;
        let marginBottom = 20;
        let paddingLeft = 30;
        let paddingRight = 30;
        let paddingBottom = 15;
        let xRange = [marginLeft + paddingLeft, width - marginRight - paddingRight];
        let yRange = [height - marginBottom - paddingBottom, marginTop];

        let data = this.transformData(options);
        let indices = d3.range(0, data.numRows());
        let dataRegion = data.getter("region");
        let dataOperation = data.getter("operation");
        let dataX = data.getter("x");
        let dataY = data.getter("y");
        let dataYhat = data.getter("yhat");
        let dataLower = data.getter("lower");
        let dataUpper = data.getter("upper");
        let indicesRegression = [
            d3.filter(indices, d => dataX(d) == aq.agg(data, aq.op.min("x")))[0],
            d3.filter(indices, d => dataX(d) == aq.agg(data, aq.op.max("x")))[0]
        ]
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
                    d3.max([domains["y"][1], aq.agg(data, aq.op.min("upper"))]),
                    d3.min
                ],
                yRange
            );
        }
        let xLabel: string = this.xSelect.value;
        let yLabel: string = this.ySelect.value;

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
        let area = d3.area<any>()
            .curve(d3.curveLinear)
            .x(d => xScale(dataX(d)))
            .y0(d => yScale(dataLower(d)))
            .y1(d => yScale(dataUpper(d)))

        let zoom = d3.zoom().scaleExtent([0, Infinity]).on("zoom", (event) => {

            let transform = event.transform;
            let xScaleZoomed = transform.rescaleX(xScale);
            let yScaleZoomed = transform.rescaleY(yScale);

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
                    .attr("y", marginBottom / 4)
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
                .attr("stroke-width", 5 / transform.k);

            this.label
                .selectAll("text")
                .data(indices)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.1em")
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

            this.chartHighlightRegion
                .selectAll("path")
                .data(indicesHighlightRegion)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);

            this.chartHighlightOperation
                .selectAll("path")
                .data(indicesHighlightOperation)
                .join("path")
                .attr("d", d => `M ${xScale(dataX(d))} ${yScale(dataY(d))} h 0`)
                .attr("transform", transform)
                .attr("stroke-width", 10 / transform.k);

            this.labelHighlightOperation
                .selectAll("text")
                .data(indicesHighlightOperation)
                .join("text")
                .text(d => dataOperation(d))
                .attr("x", d => xScale(dataX(d)))
                .attr("y", d => yScale(dataY(d)))
                .attr("dy", "1.1em")
                .attr("transform", transform)
                .attr("font-size", 14 / transform.k);

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
        this.chart = this.svg
            .append("g")
            .classed("chart", true);
        this.label = this.svg
            .append("g")
            .classed("label", true);
        this.chartHighlightRegion = this.svg
            .append("g")
            .classed("chartHighlightRegion", true);
        this.chartHighlightOperation = this.svg
            .append("g")
            .classed("chartHighlightOperation", true);
        this.labelHighlightOperation = this.svg
            .append("g")
            .classed("labelHighlightOperation", true);

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