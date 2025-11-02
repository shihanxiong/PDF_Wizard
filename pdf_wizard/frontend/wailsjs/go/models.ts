export namespace main {
	
	export class FileMetadata {
	    path: string;
	    name: string;
	    size: number;
	    lastModified: string;
	    isPDF: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.size = source["size"];
	        this.lastModified = source["lastModified"];
	        this.isPDF = source["isPDF"];
	    }
	}

}

