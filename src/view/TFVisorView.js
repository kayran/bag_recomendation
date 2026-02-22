import { View } from './View.js';

export class TFVisorView extends View {
  #logs = [];
  #lossPoints = [];
  #accPoints = [];
  #isVisOpen = false;
  constructor() {
    super();
  }

  resetDashboard() {
    this.#logs = [];
    this.#lossPoints = [];
    this.#accPoints = [];
    this.#isVisOpen = false;
  }

  handleTrainingLog(log) {
    if (!this.#isVisOpen) {
      const bottomSheet = document.getElementById('tfvisBottomSheet');
      if (bottomSheet) bottomSheet.style.display = 'block';
      this.#isVisOpen = true;
    }

    const { epoch, loss, accuracy } = log;
    this.#lossPoints.push({ x: epoch, y: loss });
    this.#accPoints.push({ x: epoch, y: accuracy });
    this.#logs.push(log);

    const accContainer = document.getElementById('tfvisAccChart');
    if (accContainer) {
      tfvis.render.linechart(
        accContainer,
        { values: this.#accPoints, series: ['precisão'] },
        {
          xLabel: 'Época (Ciclos de Treinamento)',
          yLabel: 'Precisão (%)',
        }
      );
    }

    const lossContainer = document.getElementById('tfvisLossChart');
    if (lossContainer) {
      tfvis.render.linechart(
        lossContainer,
        { values: this.#lossPoints, series: ['erros'] },
        {
          xLabel: 'Época (Ciclos de Treinamento)',
          yLabel: 'Valor do Erro',
        }
      );
    }
  }
}
