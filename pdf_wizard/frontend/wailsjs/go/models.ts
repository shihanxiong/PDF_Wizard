export namespace models {
	
	export class PDFMetadata {
	    path: string;
	    name: string;
	    size: number;
	    lastModified: string;
	    isPDF: boolean;
	    totalPages: number;
	
	    static createFrom(source: any = {}) {
	        return new PDFMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.size = source["size"];
	        this.lastModified = source["lastModified"];
	        this.isPDF = source["isPDF"];
	        this.totalPages = source["totalPages"];
	    }
	}
	export class RotateDefinition {
	    startPage: number;
	    endPage: number;
	    rotation: number;
	
	    static createFrom(source: any = {}) {
	        return new RotateDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startPage = source["startPage"];
	        this.endPage = source["endPage"];
	        this.rotation = source["rotation"];
	    }
	}
	export class SplitDefinition {
	    startPage: number;
	    endPage: number;
	    filename: string;
	
	    static createFrom(source: any = {}) {
	        return new SplitDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startPage = source["startPage"];
	        this.endPage = source["endPage"];
	        this.filename = source["filename"];
	    }
	}
	export class TextWatermarkConfig {
	    text: string;
	    fontSize: number;
	    fontColor: string;
	    opacity: number;
	    rotation: number;
	    position: string;
	    fontFamily: string;
	
	    static createFrom(source: any = {}) {
	        return new TextWatermarkConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	        this.fontSize = source["fontSize"];
	        this.fontColor = source["fontColor"];
	        this.opacity = source["opacity"];
	        this.rotation = source["rotation"];
	        this.position = source["position"];
	        this.fontFamily = source["fontFamily"];
	    }
	}
	export class WatermarkDefinition {
	    textConfig: TextWatermarkConfig;
	    pageRange: string;
	
	    static createFrom(source: any = {}) {
	        return new WatermarkDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.textConfig = this.convertValues(source["textConfig"], TextWatermarkConfig);
	        this.pageRange = source["pageRange"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

