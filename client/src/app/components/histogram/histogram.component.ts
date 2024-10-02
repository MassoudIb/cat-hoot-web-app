/* eslint-disable @typescript-eslint/no-explicit-any */
// We are disabling this lint error to be able to use highcharts library

import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Result } from '@app/interfaces/result';
import { GameService } from '@app/services/game.service';
import * as Highcharts from 'highcharts';

import More from 'highcharts/highcharts-more';
import Boost from 'highcharts/modules/boost';
import noData from 'highcharts/modules/no-data-to-display';

Boost(Highcharts);
noData(Highcharts);
More(Highcharts);
noData(Highcharts);
declare let require: any;
require('highcharts/modules/networkgraph')(Highcharts);

@Component({
    selector: 'app-histogram',
    templateUrl: './histogram.component.html',
    styleUrls: ['./histogram.component.scss'],
})
export class HistogramComponent implements OnInit, OnChanges {
    @Input() result: Result;
    options: any;
    chart: any;
    constructor(
        protected gameService: GameService,
        private changeDetector: ChangeDetectorRef,
    ) {}
    ngOnInit(): void {
        if (this.gameService) {
            this.gameService.resultUpdated.subscribe((newResult: Result) => {
                this.result = newResult;
                this.setOptions();
                this.changeDetector.detectChanges();
            });
            this.setOptions();
            this.chart = Highcharts.chart('container', this.options);
        }
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['result'] && this.result) {
            if (this.options) {
                this.updateChart();
                this.chart.redraw();
            }
        }
    }
    setOptions() {
        if (this.result.choices) {
            const categories = this.result.choices.map((choice) => choice.choice);
            const data = this.result.choices.map((choice) => ({
                name: choice.choice,
                y: choice.numberOfAnswers,
                color: choice.isCorrect ? '#28a745' : '#dc3545',
            }));
            this.options = {
                chart: {
                    type: 'bar',
                },
                title: {
                    text: this.result.text,
                },
                xAxis: {
                    allowDecimals: false,
                    categories,
                    title: {
                        text: null,
                    },
                },
                yAxis: {
                    allowDecimals: false,
                    min: 0,
                    title: {
                        text: 'Nombre de réponses',
                        align: 'high',
                    },
                    labels: {
                        overflow: 'justify',
                    },
                },
                tooltip: {
                    valuePrefix: 'Rs. ',
                },
                plotOptions: {
                    bar: {
                        dataLabels: {
                            enabled: true,
                        },
                    },
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -40,
                    y: 80,
                    floating: true,
                    borderWidth: 1,
                    backgroundColor: '#FFFFFF',
                    shadow: true,
                },
                credits: {
                    enabled: false,
                },
                series: [
                    {
                        name: this.result.text,
                        data,
                        color: '#FFFFFF',
                    },
                ],
                accessibility: {
                    enabled: false,
                },
            };
        }
    }
    updateChart(): void {
        if (this.options) {
            this.options.title.text = this.result.text;
            this.options.xAxis.categories = this.result.choices.map((choice) => choice.choice);
            this.options.series[0].data = this.result.choices.map((choice) => {
                return {
                    name: choice.choice,
                    y: choice.numberOfAnswers,
                    color: choice.isCorrect ? '#28a745' : '#dc3545',
                };
            });
        }

        if (this.chart) {
            this.chart.update(this.options);
        }
    }
}
