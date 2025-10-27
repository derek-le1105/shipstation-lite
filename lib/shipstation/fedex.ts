import { ShipStationService } from "./client";

export const FEDEX_SERVICES: ShipStationService[] = [
  {
    carrierCode: "fedex",
    code: "fedex_ground",
    name: "FedEx Ground®",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_home_delivery",
    name: "FedEx Home Delivery®",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_2day",
    name: "FedEx 2Day®",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_2day_am",
    name: "FedEx 2Day® A.M.",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_standard_overnight",
    name: "FedEx Standard Overnight®",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_priority_overnight",
    name: "FedEx Priority Overnight®",
    domestic: true,
    international: false,
  },
  {
    carrierCode: "fedex",
    code: "fedex_first_overnight",
    name: "FedEx First Overnight®",
    domestic: true,
    international: false,
  },
];
