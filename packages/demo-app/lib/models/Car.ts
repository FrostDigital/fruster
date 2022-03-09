export interface Car {
  /**
   * Id of car
   * @TJS-format uuid
   */
  id: string;

  /**
   * Car model, for example "Model 3"
   */
  model: string;

  /**
   * Car brand, for example "Tesla"
   */
  brand: string;
}
